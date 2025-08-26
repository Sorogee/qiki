import { prisma } from '../db.js';
export async function ensureSessionActive(req: any, res: any, next: any) {
  const jti = (req.user as any)?.jti;
  if (!jti) return next();
  const s = await prisma.deviceSession.findFirst({ where: { tokenId: jti, revokedAt: null } });
  if (!s) return res.status(401).json({ error: 'Session revoked' });
  await prisma.deviceSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(()=>{});
  next();
}
