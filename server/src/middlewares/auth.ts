import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.js';
import { verifyJwtWithJti } from '../utils/jwt2.js';

export interface AuthUser { id: string; username: string; email: string; }
declare global {
  namespace Express { interface Request { user?: AuthUser; } }
}

function parseCookie(header?: string): Record<string,string> {
  const out: Record<string,string> = {};
  if (!header) return out;
  header.split(';').forEach(p=>{ const [k, ...v] = p.trim().split('=');)};
  return out;
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    const token = h.substring('Bearer '.length);
    let payload = await verifyJwtWithJti<AuthUser>(token);
    if (!payload) payload = verifyJwt<AuthUser>(token);
    if (payload) req.user = payload;
  }
  if (!req.user) {
    const cookies = parseCookie(req.headers['cookie']);
    const token = cookies['qid'];
    if (token) {
      let payload = await verifyJwtWithJti<AuthUser>(token);
    if (!payload) payload = verifyJwt<AuthUser>(token);
      if (payload) req.user = payload;
    }
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    const token = h.substring('Bearer '.length);
    let payload = await verifyJwtWithJti<AuthUser>(token);
    if (!payload) payload = verifyJwt<AuthUser>(token);
    if (payload) {
    // Optional freshness check: tokens issued before password change are rejected
    const iatSec = (payload as any).iat ? Number((payload as any).iat) : 0;
    try {
      const { prisma } = await import('../db.js');
      const u = await prisma.user.findUnique({ where: { id: (payload as any).id }, select: { passwordChangedAt: true, banned: true } });
      if (u?.banned) return res.status(403).json({ error: 'Account banned' });
      const changedAt = u?.passwordChangedAt ? Math.floor(new Date(u.passwordChangedAt).getTime() / 1000) : 0;
      if (changedAt && iatSec && iatSec < changedAt) return res.status(401).json({ error: 'Session expired' });
    } catch {}
    req.user = { id: (payload as any).id || (payload as any).sub, username: (payload as any).username, email: (payload as any).email } as any; return next();
  }
  }
  const cookies = parseCookie(req.headers['cookie']);
  const token = cookies['qid'];
  if (token) {
    let payload = await verifyJwtWithJti<AuthUser>(token);
    if (!payload) payload = verifyJwt<AuthUser>(token);
    if (payload) {
    // Optional freshness check: tokens issued before password change are rejected
    const iatSec = (payload as any).iat ? Number((payload as any).iat) : 0;
    try {
      const { prisma } = await import('../db.js');
      const u = await prisma.user.findUnique({ where: { id: (payload as any).id }, select: { passwordChangedAt: true, banned: true } });
      if (u?.banned) return res.status(403).json({ error: 'Account banned' });
      const changedAt = u?.passwordChangedAt ? Math.floor(new Date(u.passwordChangedAt).getTime() / 1000) : 0;
      if (changedAt && iatSec && iatSec < changedAt) return res.status(401).json({ error: 'Session expired' });
    } catch {}
    req.user = { id: (payload as any).id || (payload as any).sub, username: (payload as any).username, email: (payload as any).email } as any; return next();
  }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

export async function requireAuthOptional(req: any, _res: any, next: any) {
  try { await jwtCookie(req); } catch {}
  next();
}
