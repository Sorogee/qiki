import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth as any, async (req: any, res) => {
  const rows = await prisma.deviceSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(rows);
});

router.post('/revoke', requireAuth as any, async (req: any, res) => {
  const p = z.object({ id: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  await prisma.deviceSession.update({ where: { id: p.data.id }, data: { revokedAt: new Date() } }).catch(() => {});
  res.json({ ok: true });
});

router.post('/revoke_all', requireAuth as any, async (req: any, res) => {
  await prisma.deviceSession.updateMany({
    where: { userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });
  res.json({ ok: true });
});

export default router;
