import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/export', requireAuth as any, async (req: any, res) => {
  // Admin-only (or later: community mods export per-community)
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
  if (!me || me.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  const limit = z.coerce.number().max(10000).parse(req.query.limit || '5000');
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(rows));
});

export default router;
