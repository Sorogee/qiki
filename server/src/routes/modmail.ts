import { Router } from 'express';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCommunityMod } from '../middlewares/mods.js';
import { publishBroadcast } from '../realtime/ws.js';

const router = Router({ mergeParams: true });

const subjectClean = (s:string)=> sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).slice(0,120);
const bodyClean = (s:string)=> sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).slice(0,4000);

// List threads
router.get('/', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const rows = await prisma.modmailThread.findMany({ where: { communityId: req.communityId }, orderBy: { updatedAt: 'desc' }, take: 100 });
  res.json(rows);
});

// Create thread
router.post('/', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const p = z.object({ subject: z.string().min(1), body: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const t = await prisma.modmailThread.create({ data: { communityId: req.communityId, subject: subjectClean(p.data.subject), createdById: req.user.id, status: 'OPEN' } });
  await prisma.modmailParticipant.create({ data: { threadId: t.id, userId: req.user.id, role: 'MOD' } });
  const m = await prisma.modmailMessage.create({ data: { threadId: t.id, authorId: req.user.id, body: bodyClean(p.data.body) } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'MODMAIL_CREATE', meta: { communityId: req.communityId, threadId: t.id } } as any });
  publishBroadcast({ type: 'modmail:new_thread', threadId: t.id, communityId: req.communityId });
  res.json({ thread: t, first: m });
});

// Messages for a thread
router.get('/:threadId', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const tid = req.params.threadId;
  const t = await prisma.modmailThread.findUnique({ where: { id: tid } });
  if (!t || t.communityId !== req.communityId) return res.status(404).json({ error: 'thread_not_found' });
  const msgs = await prisma.modmailMessage.findMany({ where: { threadId: tid }, orderBy: { createdAt: 'asc' }, take: 500 });
  res.json({ thread: t, messages: msgs });
});

// Post reply
router.post('/:threadId', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const tid = req.params.threadId;
  const t = await prisma.modmailThread.findUnique({ where: { id: tid } });
  if (!t || t.communityId !== req.communityId) return res.status(404).json({ error: 'thread_not_found' });
  const p = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const msg = await prisma.modmailMessage.create({ data: { threadId: tid, authorId: req.user.id, body: bodyClean(p.data.body) } });
  await prisma.modmailThread.update({ where: { id: tid }, data: { updatedAt: new Date() } });
  publishBroadcast({ type: 'modmail:new_message', threadId: tid, communityId: req.communityId });
  res.json({ ok: true, message: msg });
});

// Close thread
router.post('/:threadId/close', requireAuth as any, requireCommunityMod as any, async (req: any, res) => {
  const tid = req.params.threadId;
  const t = await prisma.modmailThread.findUnique({ where: { id: tid } });
  if (!t || t.communityId !== req.communityId) return res.status(404).json({ error: 'thread_not_found' });
  await prisma.modmailThread.update({ where: { id: tid }, data: { status: 'CLOSED' } });
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'MODMAIL_CLOSE', meta: { communityId: req.communityId, threadId: tid } } as any });
  res.json({ ok: true });
});

export default router;
