import { Router } from 'express';
import { prisma } from '../db.js';
import { ping as osPing, enabled as osEnabled } from '../search/client.js';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.get('/readinessz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const os = osEnabled ? await osPing() : null;
    res.json({ ok: true, db: true, search: os });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

export default router;
