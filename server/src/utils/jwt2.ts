import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
export async function signJwtWithJti(payload: any, expiresIn = '7d') {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti }, config.jwtSecret, { expiresIn });
  return { token, jti };
}


export async function verifyJwtWithJti<T=any>(token: string): Promise<T|null> {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    // Require JTI
    const jti = payload?.jti;
    if (!jti) return null;
    // Validate against device sessions
    const { prisma } = await import('../db.js');
    const ds = await prisma.deviceSession.findFirst({ where: { tokenId: jti, revokedAt: null } });
    if (!ds) return null;
    return payload as T;
  } catch {
    return null;
  }
}
