import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export async function attachRole(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true, banned: true } });
  (req as any).userRole = u?.role || 'USER';
  (req as any).userBanned = u?.banned || false;
  next();
}

export function requireRole(roles: ('ADMIN'|'MOD')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = (req as any).userRole || 'USER';
    if (roles.includes('ADMIN') && r === 'ADMIN') return next();
    if (roles.includes('MOD') && (r === 'MOD' || r === 'ADMIN')) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
