import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { hotScore, topScore } from '../utils/rank.js';

const router = Router();

/**
 * GET /api/feed?sort=hot|new|top&time=24h|week|month|year|all&community=slug&nsfw=exclude|include|only&limit=25&cursor=postId
 */
router.get('/', async (req, res) => {
  const p = z.object({
    sort: z.enum(['hot','new','top']).default('hot'),
    time: z.enum(['24h','week','month','year','all']).default('all'),
    community: z.string().optional(),
    nsfw: z.enum(['exclude','include','only']).default('exclude'),
    limit: z.coerce.number().min(1).max(100).default(25),
    cursor: z.string().optional(),
  }).safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: 'Invalid query' });
  const { sort, time, community, nsfw, limit, cursor } = p.data;

  // Time window
  const now = new Date();
  const from = (() => {
    switch (time) {
      case '24h': return new Date(Date.now() - 24*60*60*1000);
      case 'week': return new Date(Date.now() - 7*24*60*60*1000);
      case 'month': return new Date(Date.now() - 30*24*60*60*1000);
      case 'year': return new Date(Date.now() - 365*24*60*60*1000);
      default: return undefined;
    }
  })();

  const where:any = {};
  if (from) where.createdAt = { gte: from };
  where.status = 'VISIBLE';
  if (community) {
    const c = await prisma.community.findUnique({ where: { slug: community } });
    if (!c) return res.status(404).json({ error: 'Community not found' });
    where.communityId = c.id;
  }
  if (nsfw === 'exclude') where.nsfw = false;
  if (nsfw === 'only') where.nsfw = true;

  // Pagination by createdAt/id for 'new'; score-based for others
  const take = limit;
  const baseSelect:any = { id: true, title: true, body: true, url: true, createdAt: true, communityId: true, nsfw: true,
    _count: { select: { comments: true } },
    votes: { select: { value: true } },
    community: { select: { id: true, slug: true, name: true } },
  };

  if (sort === 'new') {
    const rows = await prisma.post.findMany({
      where, select: baseSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take, skip: 0, cursor: cursor ? { id: cursor } as any : undefined
    });
    return res.json({ items: rows, nextCursor: rows.length === take ? rows[rows.length-1].id : null });
  }

  // For hot/top: fetch a slightly larger set in time window, then sort in memory by score
  const rows = await prisma.post.findMany({
    where, select: baseSelect, orderBy: [{ createdAt: 'desc' }], take: Math.min(500, take*4),
  });

  const scored = rows.map(r => {
    const ups = r.votes?.filter((v:any)=>v.value>0).length || 0;
    const downs = r.votes?.filter((v:any)=>v.value<0).length || 0;
    const score = sort === 'hot' ? hotScore(ups, downs, r.createdAt) : topScore(ups, downs);
    return { r, ups, downs, score };
  }).sort((a,b)=> b.score - a.score).slice(0, take);

  res.json({ items: scored, nextCursor: null, asOf: now.toISOString() });
});

export default router;
