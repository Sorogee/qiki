import { config } from '../config.js';

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (process.env.EMAIL_TRANSPORT === 'console' || process.env.FREE_MODE === 'true') {
    // eslint-disable-next-line no-console
    console.log('[email:console]', { to, subject });
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dir = path.resolve(process.cwd(), 'server/var/outbox');
      fs.mkdirSync(dir, { recursive: true });
      const line = JSON.stringify({ ts: new Date().toISOString(), to, subject, text, html }) + '\n';
      fs.appendFileSync(path.join(dir, 'emails.log'), line, 'utf-8');
    } catch {}
    return { ok: true };

  }
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: (config.smtp.user && config.smtp.pass) ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  try {
    const info = await transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
    return info;
  } catch (e) {
    console.error('Email error:', e);
    return null;
  }
}
