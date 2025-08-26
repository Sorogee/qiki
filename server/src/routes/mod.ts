import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { audit } from '../utils/audit.js';
import { scanDel, keys } from '../cache/redis.js';

const router = Router();

function isAdmin(u:any){ return u?.role === 'ADMIN'; }
async function isCommunityMod(userId: string, communityId: string){
  const m = await prisma.communityMember.findFirst({ where: { userId, communityId, role: 'MODERATOR' } });
  return !!m;
}

async function caseFor(subjectType: 'POST'|'COMMENT'|'USER', subjectId: string, communityId?: string, createdById?: string) {
  let mc = await prisma.modCase.findFirst({ where: { subjectType, subjectId, status: { in: ['OPEN','ESCALATED'] } } });
  if (!mc) {
    mc = await prisma.modCase.create({ data: { subjectType, subjectId, communityId, createdById, status: 'OPEN' } });
  }
  return mc;
}

// Bulk actions
router.post('/bulk', requireAuth as any, async (req:any, res) => {
  const p = z.object({
    action: z.enum(['APPROVE','REMOVE','LOCK','UNLOCK','NSFW','UNNSFW','BAN','SHADOWBAN','WARN','ESCALATE']),
    targets: z.array(z.object({ type: z.enum(['POST','COMMENT','USER']), id: z.string() })).min(1),
    reason: z.string().optional(),
    metadata: z.any().optional()
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const user = req.user!;

  const results:any[] = [];
  for (const t of p.data.targets) {
    // permission checks
    let communityId: string|undefined;
    if (t.type === 'POST') {
      const post = await prisma.post.findUnique({ where: { id: t.id } });
      if (!post) { results.push({ id: t.id, ok: false, error: 'Not found' }); continue; }
      communityId = post.communityId;
      if (!isAdmin(user) && !(await isCommunityMod(user.id, post.communityId))) { results.push({ id: t.id, ok:false, error:'Forbidden' }); continue; }
      if (p.data.action === 'APPROVE') await prisma.post.update({ where: { id: t.id }, data: { status: 'VISIBLE', modReason: null } });
      if (p.data.action === 'REMOVE') await prisma.post.update({ where: { id: t.id }, data: { status: 'REMOVED', modReason: p.data.reason || null } });
      if (p.data.action === 'LOCK') await prisma.post.update({ where: { id: t.id }, data: { isLocked: true } });
      if (p.data.action === 'UNLOCK') await prisma.post.update({ where: { id: t.id }, data: { isLocked: false } });
      // nsfw flag could be a field; if not, store in metadata or tag
      // invalidate feed caches
      try { await scanDel(keys.feed()); } catch {}
    } else if (t.type === 'COMMENT') {
      const c = await prisma.comment.findUnique({ where: { id: t.id }, include: { post: true } });
      if (!c) { results.push({ id: t.id, ok: false, error: 'Not found' }); continue; }
      communityId = c.post.communityId;
      if (!isAdmin(user) && !(await isCommunityMod(user.id, c.post.communityId))) { results.push({ id: t.id, ok:false, error:'Forbidden' }); continue; }
      if (p.data.action === 'APPROVE') await prisma.comment.update({ where: { id: t.id }, data: { isRemoved: false } });
      if (p.data.action === 'REMOVE') await prisma.comment.update({ where: { id: t.id }, data: { isRemoved: true } });
      // locking at comment-level not typical; ignore
    } else if (t.type === 'USER') {
      // Global user actions for ADMINs
      if (!isAdmin(user)) { results.push({ id: t.id, ok:false, error:'Admin only' }); continue; }
      if (p.data.action === 'SHADOWBAN') await prisma.user.update({ where: { id: t.id }, data: { isShadowbanned: true as any } as any).catch(()=>{});
      if (p.data.action === 'BAN') await prisma.user.update({ where: { id: t.id }, data: { isBanned: true as any } as any).catch(()=>{});
      // WARN could be email/notification; skipped here
    }
    const caze = await caseFor(t.type as any, t.id, communityId, user.id);
    await prisma.moderationAction.create({ data: { caseId: caze.id, actorId: user.id, action: p.data.action, targetType: t.type, targetId: t.id, communityId, reason: p.data.reason || null, metadata: p.data.metadata as any } });
    await audit(req, `mod.bulk.${p.data.action.toLowerCase()}`, t.type, t.id, { reason: p.data.reason });
    results.push({ id: t.id, ok: true });
  }
  res.json({ results });
});

// Escalation (case-level)
router.post('/cases/:id/escalate', requireAuth as any, async (req:any, res) => {
  const caze = await prisma.modCase.findUnique({ where: { id: req.params.id } });
  if (!caze) return res.status(404).json({ error: 'Not found' });
  // Allow community mod for community cases, admin otherwise
  if (!isAdmin(req.user) && !(caze.communityId && await isCommunityMod(req.user.id, caze.communityId))) return res.status(403).json({ error: 'Forbidden' });
  await prisma.modCase.update({ where: { id: caze.id }, data: { status: 'ESCALATED' } });
  await prisma.moderationAction.create({ data: { caseId: caze.id, actorId: req.user.id, action: 'ESCALATE', targetType: caze.subjectType, targetId: caze.subjectId, communityId: caze.communityId } });
  await audit(req, 'mod.case.escalate', caze.subjectType, caze.subjectId, {});
  res.json({ ok: true });
});

// Close (resolve) a case and start 90-day evidence retention window
router.post('/cases/:id/resolve', requireAuth as any, async (req:any, res) => {
  const caze = await prisma.modCase.findUnique({ where: { id: req.params.id } });
  if (!caze) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && !(caze.communityId && await isCommunityMod(req.user.id, caze.communityId))) return res.status(403).json({ error: 'Forbidden' });
  const closedAt = new Date();
  await prisma.modCase.update({ where: { id: caze.id }, data: { status: 'RESOLVED', closedAt } });
  const cutoff = new Date(closedAt.getTime() + 90*24*60*60*1000);
  await prisma.evidence.updateMany({ where: { caseId: caze.id }, data: { purgeAfter: cutoff } });
  await audit(req, 'mod.case.resolve', caze.subjectType, caze.subjectId, {});
  res.json({ ok: true, purgeAfter: cutoff });
});

// Add evidence (text/link)
router.post('/cases/:id/evidence', requireAuth as any, async (req:any, res) => {
  const p = z.object({ kind: z.enum(['TEXT','LINK']), text: z.string().optional(), url: z.string().url().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const caze = await prisma.modCase.findUnique({ where: { id: req.params.id } });
  if (!caze) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && !(caze.communityId && await isCommunityMod(req.user.id, caze.communityId))) return res.status(403).json({ error: 'Forbidden' });
  const ev = await prisma.evidence.create({ data: { caseId: caze.id, kind: p.data.kind, text: p.data.text || null, url: p.data.url || null } });
  res.json(ev);
});

// Snapshot evidence helpers when removing posts/comments
async function snapshotIfNeeded(type:'POST'|'COMMENT', id: string, caseId: string) {
  if (type === 'POST') {
    const p = await prisma.post.findUnique({ where: { id }, include: { author: true, community: true } });
    if (!p) return;
    await prisma.evidence.create({ data: { caseId, kind: 'SNAPSHOT', text: JSON.stringify({ title: p.title, body: p.body, url: p.url, authorId: p.authorId, communityId: p.communityId, createdAt: p.createdAt }) } });
  } else {
    const c = await prisma.comment.findUnique({ where: { id }, include: { author: true, post: true } });
    if (!c) return;
    await prisma.evidence.create({ data: { caseId, kind: 'SNAPSHOT', text: JSON.stringify({ body: c.body, authorId: c.authorId, postId: c.postId, createdAt: c.createdAt }) } });
  }
}

// Appeals
router.post('/appeals', requireAuth as any, async (req:any, res) => {
  const p = z.object({ subjectType: z.enum(['POST','COMMENT','USER']), subjectId: z.string(), reason: z.string().min(5) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  // ensure user owns the subject (if post/comment) or is the user for USER
  if (p.data.subjectType === 'POST') {
    const post = await prisma.post.findUnique({ where: { id: p.data.subjectId } });
    if (!post || post.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const caze = await caseFor('POST', post.id, post.communityId, req.user.id);
    const appeal = await prisma.appeal.create({ data: { caseId: caze.id, userId: req.user.id, reason: p.data.reason } });
    return res.json(appeal);
  } else if (p.data.subjectType === 'COMMENT') {
    const c = await prisma.comment.findUnique({ where: { id: p.data.subjectId } });
    if (!c || c.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const caze = await caseFor('COMMENT', c.id, (await prisma.post.findUnique({ where: { id: c.postId } }))!.communityId, req.user.id);
    const appeal = await prisma.appeal.create({ data: { caseId: caze.id, userId: req.user.id, reason: p.data.reason } });
    return res.json(appeal);
  } else {
    if (p.data.subjectId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const caze = await caseFor('USER', req.user.id, undefined, req.user.id);
    const appeal = await prisma.appeal.create({ data: { caseId: caze.id, userId: req.user.id, reason: p.data.reason } });
    return res.json(appeal);
  }
});

router.get('/appeals', requireAuth as any, async (req:any, res) => {
  if (!isAdmin(req.user)) {
    // mods see cases for their communities only
    const mods = await prisma.communityMember.findMany({ where: { userId: req.user.id, role: 'MODERATOR' }, select: { communityId: true } });
    const cids = mods.map(m => m.communityId);
    const rows = await prisma.appeal.findMany({ where: { case: { communityId: { in: cids } } }, orderBy: { createdAt: 'desc' }, include: { case: true, user: true } });
    return res.json(rows);
  }
  const rows = await prisma.appeal.findMany({ orderBy: { createdAt: 'desc' }, include: { case: true, user: true } });
  res.json(rows);
});

router.post('/appeals/:id/resolve', requireAuth as any, async (req:any, res) => {
  const p = z.object({ decision: z.enum(['ACCEPTED','REJECTED']), note: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const ap = await prisma.appeal.findUnique({ where: { id: req.params.id }, include: { case: true } });
  if (!ap) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && !(ap.case.communityId && await prisma.communityMember.findFirst({ where: { userId: req.user.id, communityId: ap.case.communityId, role: 'MODERATOR' } }))) return res.status(403).json({ error: 'Forbidden' });
  await prisma.appeal.update({ where: { id: ap.id }, data: { status: p.data.decision, decisionNote: p.data.note || null } });
  await audit(req, 'mod.appeal.resolve', ap.case.subjectType, ap.case.subjectId, { decision: p.data.decision });
  res.json({ ok: true });
});

// Audit log export
router.get('/audit/export', requireAuth as any, async (req:any, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admin only' });
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7*24*60*60*1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const format = (String(req.query.format || 'csv')).toLowerCase();
  const rows = await prisma.auditLog.findMany({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: 'asc' } });

  if (format === 'ndjson') {
    res.setHeader('Content-Type', 'application/x-ndjson');
    for (const r of rows) res.write(JSON.stringify(r) + '\n');
    return res.end();
  }
  res.setHeader('Content-Type', 'text/csv');
  res.write('createdAt,actorId,action,targetType,targetId,ip,userAgent\n');
  for (const r of rows) {
    const esc = (s:any)=> (s==null?'':String(s).replace(/"/g,'""'));
    res.write(`"${r.createdAt.toISOString()}","${esc(r.actorId)}","${esc(r.action)}","${esc(r.targetType)}","${esc(r.targetId)}","${esc(r.ip)}","${esc(r.userAgent)}"\n`);
  }
  res.end();
});

export default router;
