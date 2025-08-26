import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

type KarmaReason =
  | 'post_upvote' | 'post_downvote' | 'comment_upvote' | 'comment_downvote'
  | 'post_removed' | 'comment_removed';

const weights: Record<KarmaReason, number> = {
  post_upvote: 1,
  post_downvote: -1,
  comment_upvote: 1,
  comment_downvote: -1,
  post_removed: -2,
  comment_removed: -1,
};

export async function addKarma(userId: string, reason: KarmaReason, count = 1) {
  const delta = (weights[reason] || 0) * count;
  if (!delta) return;
  await prisma.user.update({ where: { id: userId }, data: { karma: { increment: delta } } });
  await recalcTrust(userId).catch(e => logger.warn({ msg:'recalc_trust_failed', err:String(e) }));
}

export async function recalcTrust(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, createdAt: true, karma: true, trustLevel: true } });
  if (!u) return;
  const minK = parseInt(process.env.TRUSTED_MIN_KARMA || '100', 10);
  const minDays = parseInt(process.env.TRUSTED_MIN_ACCOUNT_AGE_DAYS || '14', 10);
  const ageDays = (Date.now() - new Date(u.createdAt).getTime()) / 86400000;
  let level:'NEW'|'MEMBER'|'TRUSTED' = 'NEW';
  if (u.karma >= minK && ageDays >= minDays) level = 'TRUSTED';
  else if (u.karma >= 10 && ageDays >= 2) level = 'MEMBER';
  if (u.trustLevel !== level) {
    await prisma.user.update({ where: { id: u.id }, data: { trustLevel: level } });
  }
}
