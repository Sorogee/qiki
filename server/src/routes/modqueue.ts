import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { z } from 'zod';
import { audit } from '../utils/audit.js';
import { delPrefix, keys } from '../cache/redis.js';
import { addKarma } from '../trust/karma.js';

const router = Router();

router.get('/', requireAuth as any, async (req, res) => {
  // Admin sees all; moderators see their communities
  const take = Math.min(parseInt(String(req.query.limit || '50')), 200);
  if (req.user!.role === 'ADMIN') {
    const rows = await prisma.post.findMany({ where: { status: 'QUEUED' as any }, orderBy: { modQueuedAt: 'desc' }, take, include: { community: true, author: true } });
    return res.json(rows);
  }
  const mods = await prisma.communityMember.findMany({ where: { userId: req.user!.id, role: 'MODERATOR' } });
  const rows = await prisma.post.findMany({ where: { status: 'QUEUED' as any, communityId: { in: mods.map(m => m.communityId) } }, orderBy: { modQueuedAt: 'desc' }, take, include: { community: true, author: true } });
  res.json(rows);
});

router.post('/approve', requireAuth as any, async (req, res) => {
  const p = z.object({ id: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });
  const post = await prisma.post.findUnique({ where: { id: p.data.id }, include: { community: true } });
  if (!post) return res.status(404).json({ error: 'Not found' });

  // check mod rights
  if (req.user!.role !== 'ADMIN') {
    const member = await prisma.communityMember.findFirst({ where: { userId: req.user!.id, communityId: post.communityId, role: 'MODERATOR' } });
    if (!member) return res.status(403).json({ error: 'Moderator only' });
  }

  await prisma.post.update({ where: { id: post.id }, data: { status: 'VISIBLE', modReason: null, modQueuedAt: null } });
  await audit(req, 'modqueue.approve', 'POST', post.id);
  await delPrefix(keys.feed());
  // enqueue search index
  const { enqueueSearch } = await import('../queue/enqueue.js');
  await enqueueSearch({ action: 'upsert', postId: post.id });
  res.json({ ok: true });
});

router.post('/remove', requireAuth as any, async (req, res) => {
  const p = z.object({ id: z.string(), note: z.string().max(500).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });
  const post = await prisma.post.findUnique({ where: { id: p.data.id }, include: { community: true } });
  if (!post) return res.status(404).json({ error: 'Not found' });

  if (req.user!.role !== 'ADMIN') {
    const member = await prisma.communityMember.findFirst({ where: { userId: req.user!.id, communityId: post.communityId, role: 'MODERATOR' } });
    if (!member) return res.status(403).json({ error: 'Moderator only' });
  }

  await prisma.post.update({ where: { id: post.id }, data: { status: 'REMOVED', modReason: p.data.note || post.modReason } });
  try { await addKarma(post.authorId, 'post_removed'); } catch {}
  await audit(req, 'modqueue.remove', 'POST', post.id, { note: p.data.note });
  await delPrefix(keys.feed());
  res.json({ ok: true });
});

export default router;
