import { Router } from 'express';
import { requireCaptchaFor } from '../abuse/middleware.js';
import { userLimiter, writeLimiter } from '../middlewares/rate.js';
const router = Router();

import { z } from 'zod';
import { prisma } from '../db.js';
import { prismaRO } from '../db_ro.js';
import { getJSON, setJSON, delPrefix, keys } from '../cache/redis.js';
import { rlUser } from '../abuse/rateLimit.js';
import { abuseRejected } from '../metrics.js';
import { enqueueNotify, enqueueSearch } from '../queue/enqueue.js';
import { assignFeedExperiment } from '../middlewares/experiment.js';
import { scoreFromVotes, hotRank, topRank } from '../ranking.js';
import { feedVariantServe } from '../metrics.js';
import { hashBody, setCacheHeaders, maybe304 } from '../utils/conditional.js';
import sanitizeHtml from 'sanitize-html';
import { authOptional, requireAuth } from '../middlewares/auth.js';
import { writeLimiter } from '../middlewares/rate.js';

router.use(authOptional);

const createSchema = z.object({
  communitySlug: z.string().min(3),
  title: z.string().min(1).max(300),
  body: z.string().max(20000).optional().nullable(),
  url: z.string().url().max(2000).optional().nullable(),
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  const p = createSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const community = await prisma.community.findUnique({ where: { slug: p.data.communitySlug } });
  if (!community) return res.status(404).json({ error: 'Community not found' });
  // basic anti-spam: new accounts wait 2 minutes to post
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (u && (Date.now() - new Date(u.createdAt).getTime()) < 2*60*1000) return res.status(429).json({ error: 'Account too new' });
  const cleanBody = p.data.body ? sanitizeHtml(p.data.body, { allowedTags: ['b','i','em','strong','code','pre','a','p','ul','ol','li','blockquote'], allowedAttributes: { 'a': ['href','title','rel','target'] }, transformTags: { 'a': (tagName, attribs) => ({ tagName: 'a', attribs: { attribs, rel: 'noopener nofollow ugc', target: '_blank' } }) } }) : null;
  const { RL } = await import('../abuse/rateLimit.js');
  if (links.length>0 && (user?.karma||0) < LINK_MIN_K) { return res.status(403).json({ error: 'Not enough reputation to post links yet' }); }
  try { await RL.postUserDay.consume(req.user!.id, 1); } catch { abuseRejected.labels('post_daily_cap').inc(); return res.status(429).json({ error: 'Daily post limit reached' }); }
  const post = await prisma.post.create({ data: { title: p.data.title, body: cleanBody, url: p.data.url || null, communityId: community.id, authorId: req.user!.id } });
  await delPrefix(keys.feed());
  await enqueueSearch({ action:'upsert', postId: post.id });
  res.json(post);
});

router.get('/feed', assignFeedExperiment as any, async (req, res) => {
  const { community } = req.query as { community?: string };
  const variant = (req as any).feedVariant as 'hot'|'new'|'top' || (String(req.query.sort||'hot') as any);
  const sort = variant;
  const cacheKey = keys.feed(community);
  const cached = await getJSON<any[]>(cacheKey);
  if (cached) return res.json(cached);
  const where = community ? { community: { slug: community } } : {};
  const orderBy = [{ createdAt: 'desc' as const }];
  const posts = await prismaRO.post.findMany({ where, orderBy, include: { author: true, community: true, votes: true }, take: 50 });
  const ranked = posts.map(p => ({
    id: p.id, title: p.title, body: p.body, url: p.url, createdAt: p.createdAt,
    author: { id: p.author.id, username: p.author.username },
    community: { slug: p.community.slug, name: p.community.name },
    score: p.votes.reduce((acc, v) => acc + (v.type === 'UP' ? 1 : -1), 0),
  }));
  await setJSON(cacheKey, ranked, 30);
  res.json(ranked);
});

const voteSchema = z.object({ postId: z.string(), direction: z.enum(['UP','DOWN']) });

router.post('/vote', requireAuth, writeLimiter, async (req, res) => {
  const p = voteSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { postId, direction } = p.data;
  await prisma.postVote.upsert({ where: { userId_postId: { userId: req.user!.id, postId } }, update: { type: direction as any }, create: { userId: req.user!.id, postId, type: direction as any } });
  await delPrefix(keys.feed());
  await enqueueSearch({ action:'updateScore', postId });
  res.json({ ok: true });
});

export default rrankeder;

router.post('/:id/crosspost', requireAuth as any, async (req, res) => {
  const p = z.object({ community: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });
  const original = await prisma.post.findUnique({ where: { id: req.params.id }, include: { community: true } });
  if (!original) return res.status(404).json({ error: 'Original not found' });
  const community = await prisma.community.findUnique({ where: { slug: p.data.community } });
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const x = await prisma.post.create({ data: { title: original.title, body: original.body, url: original.url, communityId: community.id, authorId: req.user!.id, originPostId: original.id, status: 'VISIBLE' as any } });
  await prisma.post.update({ where: { id: original.id }, data: { crosspostedCount: { increment: 1 } } });
  await delPrefix(keys.feed());
  await enqueueSearch({ action:'upsert', postId: x.id });
  res.json({ ok: true, id: x.id });
});

router.get('/:id', async (req, res) => {
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({ where: { id }, include: { author: { select: { id:true, username:true, shadowbanned:true } }, community: { select: { id:true, slug:true, name:true } } } });
  if (!post || (post as any).status !== 'VISIBLE' || (post as any).author?.shadowbanned) return res.status(404).json({ error: 'Not found' });
  const comments = await prisma.comment.findMany({ where: { postId: id }, orderBy: { createdAt: 'asc' }, take: 50, include: { author: { select: { id:true, username:true } } } });
  res.json({ id: post.id, title: post.title, body: post.body, url: post.url, createdAt: post.createdAt, score: (post as any).score || 0, community: post.community, author: post.author && { id: post.author.id, username: post.author.username }, comments });
});

export default router;