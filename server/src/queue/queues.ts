import { Queue } from 'bullmq';
const haveRedis = !!process.env.REDIS_URL;
const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } };

export type EmailJob = { to: string; subject: string; text: string; html?: string };
export type NotifyJob = { userId: string; type: 'comment'|string; data: any };

if (haveRedis) {
  export const EmailQueue = new Queue<EmailJob>('email', connection);
  export const NotifyQueue = new Queue<NotifyJob>('notify', connection);
} else {
  // Lightweight inline fallbacks
  export const EmailQueue = {
    async add(_name: string, job: EmailJob) {
      const { sendMail } = await import('../utils/email.js');
      await sendMail(job.to, job.subject, job.text, job.html);
      return { id: 'inline-email' };
    }
  } as any;

  export const NotifyQueue = {
    async add(_name: string, job: NotifyJob) {
      const { createNotification } = await import('../notifications.js');
      await createNotification(job.userId, job.type, job.data);
      return { id: 'inline-notify' };
    }
  } as any;
}
