import { prisma } from '../db.js';
import { extractMentions } from '../utils/text.js';
import { createNotification } from '../notifications.js';

export async function handleMentions(authorId: string, sourceType: 'POST'|'COMMENT', sourceId: string, text: string) {
  const names = extractMentions(text).slice(0, parseInt(process.env.MENTIONS_MAX_PER_ITEM || '10', 10));
  if (!names.length) return;
  const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true, username: true } });
  for (const u of users) {
    if (u.id === authorId) continue; // no self-mention
    await prisma.mention.create({ data: { sourceType, sourceId, mentionedId: u.id } });
    await createNotification(u.id, 'mention', { sourceType, sourceId, byUserId: authorId });
  }
}
