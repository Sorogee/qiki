import { Router } from 'express';
import { z } from 'zod';
import { feedEvent, feedDwell } from '../metrics.js';

const router = Router();

router.post('/event', async (req, res) => {
  const p = z.object({
    event: z.enum(['impression','click','dwell']),
    postId: z.string().optional(),
    dwellMs: z.number().int().positive().optional()
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid params' });
  const { event, dwellMs } = p.data;
  feedEvent.labels(event).inc();
  if (event === 'dwell' && typeof dwellMs === 'number') feedDwell.observe(dwellMs);
  res.json({ ok: true });
});

export default router;
