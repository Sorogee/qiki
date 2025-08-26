import { Router } from 'express';
import { requireCaptchaFor } from '../abuse/middleware.js';
import { userLimiter, writeLimiter } from '../middlewares/rate.js';
import { z } from 'zod';
import { prisma } from '../db.js';
import { rlUser } from '../abuse/rateLimit.js';
import { abuseRejected } from '../metrics.js';
import { delPrefix, keys } from '../cache/redis.js';
import { enqueueNotify, enqueueEmail, enqueueSearch } from '../queue/enqueue.js';
import { createNotification } from '../notifications.js';
import { prismaRO } from '../db_ro.js';
import sanitizeHtml from 'sanitize-html';
import { requireAuth } from '../middlewares/auth.js';
import { writeLimiter } from '../middlewares/rate.js';

const router = Router();

const createSchema = z.object({ postId: z.string(), body: z.string().min(1).max(20000), parentId: z.string().optional() });

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  const p = createSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const body = sanitizeHtml(p.data.body, { allowedTags: ['b','i','em','strong','code','pre','a'], allowedAttributes: { 'a': ['href','title','rel','target'] } });
  const { RL } = await import('../abuse/rateLimit.js');
  try { await RL.commentUserDay.consume(req.user!.id, 1); } catch { abuseRejected.labels('comment_daily_cap').inc(); return res.status(429).json({ error: 'Daily comment limit reached' }); }
  const c = await prisma.comment.create({ data: { postId: p.data.postId, body, parentId: p.data.parentId || null, authorId: req.user!.id } });
  const post = await prisma.post.findUnique({ where: { id: p.data.postId }, include: { author: { select: { id: true, username: true, email: true, emailVerified: true } } } });
  if (post && post.authorId !== req.user!.id) {
    await createNotification(post.authorId, 'comment', { postId: post.id, commentId: c.id, by: req.user!.username });
    await enqueueNotify({ userId: post.authorId, type: 'comment', data: { postId: post.id, commentId: c.id, by: req.user!.username } });
    if (post.author?.emailVerified && post.author?.email) {
      const url = `https://${process.env.EXTERNAL_DOMAIN || 'localhost'}`;
      await enqueueEmail({ to: post.author.email, subject: 'New comment on your post', text: `@${req.user!.username} commented on your post. ${url}` });
    }
  }
  await handleMentions(req.user!.id, 'COMMENT', c.id, body);
  await delPrefix(keys.feed());
  await enqueueSearch({ action:'updateCounts', postId: p.data.postId });
  res.json(c);
});

router.get('/by-post/:postId', async (req, res) => {
  const comments = await prismaRO.comment.findMany({ where: { postId: req.params.postId }, orderBy: { createdAt: 'asc' }, include: { author: true } });
  res.json(comments.map(c => ({ id: c.id, body: c.body, parentId: c.parentId, createdAt: c.createdAt, author: { id: c.author.id, username: c.author.username } })));
});

export default router;
