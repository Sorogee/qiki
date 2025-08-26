import { prisma } from '../db.js';

export type Trust = 'new' | 'normal' | 'mod' | 'admin';

const NEW_AGE_HOURS = Number(process.env.TRUST_NEW_AGE_HOURS || 24);
const NEW_MIN_POSTS = Number(process.env.TRUST_NEW_MIN_POSTS || 1);
const NEW_MIN_COMMENTS = Number(process.env.TRUST_NEW_MIN_COMMENTS || 1);

export async function getTrust(userId: string): Promise<Trust> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, createdAt: true } });
  if (!u) return 'new';
  if (u.role === 'ADMIN') return 'admin';
  if (u.role === 'MOD') return 'mod';
  const ageMs = Date.now() - new Date(u.createdAt as any).getTime();
  const ageHours = ageMs / 3600000;
  if (ageHours > NEW_AGE_HOURS) return 'normal';
  const [pc, cc] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.comment.count({ where: { authorId: userId } }),
  ]);
  if (pc >= NEW_MIN_POSTS || cc >= NEW_MIN_COMMENTS) return 'normal';
  return 'new';
}
