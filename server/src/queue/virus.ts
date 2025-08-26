import { Queue } from 'bullmq';
const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } };
export type VirusScanJob = { uploadId: string; key: string };
export const VirusQueue = new Queue<VirusScanJob>('virus-scan', connection);
export async function enqueueVirusScan(job: VirusScanJob) {
  await VirusQueue.add('scan', job, { attempts: 5, backoff: { type:'exponential', delay: 5000 } });
}
