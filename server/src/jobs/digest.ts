import { prisma } from '../db.js';
import { sendMail } from '../utils/email.js';
import { tplDigest } from '../email/templates.js';

type Freq = 'DAILY'|'WEEKLY';

async function runDigest(freq: Freq) {
  const now = new Date();
  const windowHours = freq === 'DAILY' ? 24 : 24*7;
  const since = new Date(now.getTime() - windowHours * 3600 * 1000);

  const prefs = await prisma.notificationPreference.findMany({ where: { emailDigests: freq } , include: {  } });
  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId } });
    if (!user) continue;
    const notes = await prisma.notification.findMany({ where: { userId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 50 });
    const items = notes.map(n => ({ type: n.type, createdAt: n.createdAt.toISOString() }));
    const em = tplDigest(user.username || user.email, freq, items);
    await sendMail(user.email, em.subject, em.text, em.html || undefined);
    await prisma.notificationPreference.update({ where: { userId: user.id }, data: { lastDigestAt: now } }).catch(()=>{});
  }
}

export function startDigestJob() {
  if (process.env.DISABLE_DIGEST === 'true') return;
  // quick first run delay then every 24h / 7d; in production you'd use cron
  setTimeout(()=>runDigest('DAILY').catch(()=>{}), 10_000).unref();
  setInterval(()=>runDigest('DAILY').catch(()=>{}), 24*3600*1000).unref();
  setInterval(()=>runDigest('WEEKLY').catch(()=>{}), 7*24*3600*1000).unref();
}

// For dev/testing
export async function runDigestOnce(freq: Freq) { await runDigest(freq); }
