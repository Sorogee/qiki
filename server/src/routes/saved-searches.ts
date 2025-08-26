import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth as any, async (req: any, res) => {
  const rows = await prisma.savedSearch.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(rows);
});

router.post('/', requireAuth as any, async (req: any, res) => {
  const p = z.object({ name: z.string().min(1).max(120), query: z.string().min(1).max(400) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const row = await prisma.savedSearch.create({ data: { userId: req.user!.id, name: p.data.name, query: p.data.query } });
  res.json(row);
});

router.delete('/:id', requireAuth as any, async (req: any, res) => {
  await prisma.savedSearch.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});

export default router;
