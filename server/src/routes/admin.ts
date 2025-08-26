import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { audit } from '../utils/audit.js';

const router = Router();

router.get('/users', requireAdmin as any, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const take = Math.min(parseInt(String(req.query.limit || '50')), 200);
  const where:any = q ? { OR: [ { username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ] } : {};
  const users = await prisma.user.findMany({ where, take, orderBy: { createdAt: 'desc' } });
  res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, banned: u.banned, emailVerified: u.emailVerified, createdAt: u.createdAt })));
});

router.post('/users/:id/role', requireAdmin as any, async (req, res) => {
  const p = z.object({ role: z.enum(['USER','ADMIN']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid role' });
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { role: p.data.role } });
  await audit(req, 'user.role.set', 'USER', u.id, { role: p.data.role });
  res.json({ ok: true });
});

router.post('/users/:id/ban', requireAdmin as any, async (req, res) => {
  const p = z.object({ banned: z.boolean(), reason: z.string().max(500).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { banned: p.data.banned } });
  await audit(req, p.data.banned ? 'user.ban' : 'user.unban', 'USER', u.id, { reason: p.data.reason });
  res.json({ ok: true });
});

router.get('/audit', requireAdmin as any, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(logs);
});

router.get('/export/audit.ndjson', requireAdmin as any, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.write(logs.map(l => JSON.stringify(l)).join('\n'));
  res.end();
});

export default router;

router.post('/users/:id/shadowban', requireAdmin as any, async (req, res) => {
  const p = z.object({ shadowbanned: z.boolean() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  await prisma.user.update({ where: { id: req.params.id }, data: { shadowbanned: p.data.shadowbanned } });
  await audit(req, p.data.shadowbanned ? 'user.shadowban' : 'user.unshadowban', 'USER', req.params.id);
  res.json({ ok: true });
});

router.post('/users/:id/karma', requireAdmin as any, async (req, res) => {
  const p = z.object({ delta: z.number().int() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { karma: { increment: p.data.delta } } });
  const { recalcTrust } = await import('../trust/karma.js'); await recalcTrust(u.id);
  await audit(req, 'user.karma.adjust', 'USER', u.id, { delta: p.data.delta });
  res.json({ ok: true, karma: u.karma + p.data.delta });
});
