if (!process.env.REDIS_URL) { console.log('[digest] REDIS_URL not set — digest worker disabled.'); }
import { Queue, Worker } from 'bullmq';
import { prisma } from '../db.js';
import { sendMail } from '../utils/email.js';

const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } };
type DigestJob = { freq: 'DAILY'|'WEEKLY' };

const DigestQueue = new Queue<DigestJob>('digest', connection);
new Worker('digest', async job => {
  const freq = job.data.freq;
  const now = new Date();
  const since = new Date(now.getTime() - (freq === 'DAILY' ? 24 : 24*7) * 3600 * 1000);

  const users = await prisma.notificationPreference.findMany({ where: { emailDigests: freq }, include: { user: true } });
  for (const pref of users) {
    const user = pref.user as any;
    if (!user?.emailVerified || !user.email) continue;
    const notifs = await prisma.notification.findMany({ where: { userId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 50 });
    if (!notifs.length) continue;

    const lines = notifs.map(n => {
      if (n.type === 'comment') {
        const d:any = n.data || {};
        return `New comment by @${d.by} on your post (postId=${d.postId})`;
      }
      return `${n.type}`;
    });
    const text = `Your ${freq.toLowerCase()} Qikiworld digest:\n\n` + lines.join('\n');
    await sendMail(user.email, `Your ${freq.toLowerCase()} Qikiworld digest`, text);
    await prisma.notificationPreference.update({ where: { userId: user.id }, data: { lastDigestAt: now } });
  }
}, connection);

// Schedule repeatable jobs if not exists (idempotent)
(async () => {
  await DigestQueue.add('daily', { freq: 'DAILY' }, { repeat: { pattern: '0 8 * * *' }, removeOnComplete: true });
  await DigestQueue.add('weekly', { freq: 'WEEKLY' }, { repeat: { pattern: '0 9 * * MON' }, removeOnComplete: true });
})().catch(()=>{});
