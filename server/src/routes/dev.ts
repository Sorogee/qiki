import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db.js';
import { runDigestOnce } from '../jobs/digest.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

function allowed() {
  return process.env.NODE_ENV !== 'production' || process.env.FREE_MODE === 'true' || process.env.ENABLE_DEV_ROUTES === 'true';
}

router.post('/run-digest', async (req, res) => {
  if (!allowed()) return res.status(404).json({});
  const freq = String(req.query.freq || 'DAILY');
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return res.status(400).json({ error: 'invalid freq' });
  await runDigestOnce(freq as any);
  res.json({ ok: true });
});

router.post('/notify', requireAuth as any, async (req: any, res) => {
  if (!allowed()) return res.status(404).json({});
  const type = String(req.body.type || 'test');
  const n = await prisma.notification.create({ data: { userId: req.user!.id, type, data: {} as any } });
  res.json(n);
});

router.get('/outbox', async (_req, res) => {
  if (!allowed()) return res.status(404).json({});
  const p = path.resolve(process.cwd(), 'server/var/outbox/emails.log');
  if (!fs.existsSync(p)) return res.json({ items: [] });
  const txt = fs.readFileSync(p, 'utf-8');
  const items = txt.trim().split('\n').slice(-50).map(l => { try { return JSON.parse(l); } catch { return { raw:l }; } });
  res.json({ items });
});

export default router;
