import { Router } from 'express';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCommunityMod } from '../middlewares/mods.js';

const router = Router({ mergeParams: true });

const flairSchema = z.object({
  name: z.string().min(1).max(30),
  textColor: z.string().max(20).optional(),
  bgColor: z.string().max(20).optional(),
  isUserFlair: z.boolean().optional(),
  modOnly: z.boolean().optional()
});

function cleanName(s: string) {
  return sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).slice(0, 30);
}

// List flairs for community
router.get('/', async (req, res) => {
  const slug = req.params.slug;
  const c = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
  if (!c) return res.status(404).json({ error: 'community_not_found' });
  const rows = await prisma.flair.findMany({ where: { communityId: c.id }, orderBy: { name: 'asc' } });
  res.json(rows);
});

// Create
router.post('/', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const p = flairSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const name = cleanName(p.data.name);
  const row = await prisma.flair.create({
    data: { communityId: req.communityId, name, textColor: p.data.textColor, bgColor: p.data.bgColor, isUserFlair: !!p.data.isUserFlair, modOnly: !!p.data.modOnly, createdById: req.user.id }
  });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FLAIR_CREATE', meta: { communityId: req.communityId, flairId: row.id, name } } as any });
  res.json(row);
});

// Update
router.post('/:id', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const id = req.params.id;
  const p = flairSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const name = cleanName(p.data.name);
  const row = await prisma.flair.update({ where: { id }, data: { name, textColor: p.data.textColor, bgColor: p.data.bgColor, isUserFlair: !!p.data.isUserFlair, modOnly: !!p.data.modOnly } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FLAIR_UPDATE', meta: { communityId: req.communityId, flairId: row.id, name } } as any });
  res.json(row);
});

// Delete
router.post('/:id/delete', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const id = req.params.id;
  await prisma.flair.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FLAIR_DELETE', meta: { communityId: req.communityId, flairId: id } } as any });
  res.json({ ok: true });
});

// Assign to post
router.post('/:id/assign-post', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const id = req.params.id;
  const postId = String(req.body.postId || '');
  const f = await prisma.flair.findUnique({ where: { id } });
  if (!f) return res.status(404).json({ error: 'flair_not_found' });
  await prisma.postFlair.create({ data: { postId, flairId: id, assignedById: req.user.id } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FLAIR_ASSIGN_POST', meta: { flairId: id, postId } } as any });
  res.json({ ok: true });
});

// Assign to user (user flair is per community)
router.post('/:id/assign-user', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const id = req.params.id;
  const userId = String(req.body.userId || '');
  const f = await prisma.flair.findUnique({ where: { id } });
  if (!f || !f.isUserFlair) return res.status(400).json({ error: 'not_user_flair' });
  await prisma.userFlair.upsert({ where: { userId_communityId: { userId, communityId: req.communityId } }, update: { flairId: id, assignedById: req.user.id }, create: { userId, communityId: req.communityId, flairId: id, assignedById: req.user.id } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FLAIR_ASSIGN_USER', meta: { flairId: id, userId } } as any });
  res.json({ ok: true });
});

export default router;
