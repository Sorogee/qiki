import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { enqueueDSR } from '../worker/queues.js';
import path from 'node:path';
import fs from 'node:fs';

const router = Router();

function isAdmin(u:any){ return u?.role === 'ADMIN'; }

router.get('/', requireAuth as any, async (req:any, res) => {
  // user sees own requests; admin sees all
  if (isAdmin(req.user)) {
    const rows = await prisma.dSRRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return res.json(rows);
  }
  const rows = await prisma.dSRRequest.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(rows);
});

router.post('/export', requireAuth as any, async (req:any, res) => {
  const existing = await prisma.dSRRequest.findFirst({ where: { userId: req.user.id, type: 'EXPORT', status: { in: ['PENDING','PROCESSING'] } } });
  if (existing) return res.status(429).json({ error: 'Export already in progress' });
  const row = await prisma.dSRRequest.create({ data: { type: 'EXPORT', status: 'PENDING', userId: req.user.id } });
  await enqueueDSR({ kind: 'EXPORT', requestId: row.id });
  res.json({ id: row.id, status: 'PENDING' });
});

router.post('/erasure', requireAuth as any, async (req:any, res) => {
  // Optional admin approval policy could be added here
  const existing = await prisma.dSRRequest.findFirst({ where: { userId: req.user.id, type: 'ERASURE', status: { in: ['PENDING','PROCESSING'] } } });
  if (existing) return res.status(429).json({ error: 'Erasure already in progress' });
  const row = await prisma.dSRRequest.create({ data: { type: 'ERASURE', status: 'PENDING', userId: req.user.id } });
  await enqueueDSR({ kind: 'ERASURE', requestId: row.id });
  res.json({ id: row.id, status: 'PENDING' });
});

router.get('/:id', requireAuth as any, async (req:any, res) => {
  const row = await prisma.dSRRequest.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && row.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(row);
});

router.get('/:id/download', requireAuth as any, async (req:any, res) => {
  const row = await prisma.dSRRequest.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && row.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (row.type !== 'EXPORT' || row.status !== 'COMPLETE' || !row.exportPath) return res.status(400).json({ error: 'Not ready' });
  if (!fs.existsSync(row.exportPath)) return res.status(404).json({ error: 'File missing' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="qikiworld_export_${row.userId}.zip"`);
  fs.createReadStream(row.exportPath).pipe(res);
});

export default router;
