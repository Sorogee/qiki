import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../db.js';
import { z } from 'zod';

const router = Router();

router.get('/', requireAuth as any, async (req, res) => {
  const take = Math.min(parseInt(String(req.query.limit || '50')), 200);
  const cursor = String(req.query.cursor || '');
  const where:any = { userId: req.user!.id };
  const opts:any = { where, orderBy: { createdAt: 'desc' }, take };
  if (cursor) opts.cursor = { id: cursor }, opts.skip = 1;
  const rows = await prisma.notification.findMany(opts);
  res.json({ items: rows, next: rows.length === take ? rows[rows.length-1].id : null });
});

router.post('/mark_read', requireAuth as any, async (req, res) => {
  const p = z.object({ ids: z.array(z.string()).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });
  const where:any = { userId: req.user!.id, readAt: null };
  if (p.data.ids && p.data.ids.length) where.id = { in: p.data.ids };
  await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.get('/prefs', requireAuth as any, async (req, res) => {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: req.user!.id } });
  res.json(pref || { emailDigests: 'DAILY', realtime: true });
});

router.post('/prefs', requireAuth as any, async (req, res) => {
  const p = z.object({ emailDigests: z.enum(['OFF','DAILY','WEEKLY']), realtime: z.boolean() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });
  const pref = await prisma.notificationPreference.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, emailDigests: p.data.emailDigests as any, realtime: p.data.realtime },
    update: { emailDigests: p.data.emailDigests as any, realtime: p.data.realtime }
  });
  res.json(pref);
});

export default router;
