import { Queue } from 'bullmq';

const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } };
type DSRJob = { kind: 'EXPORT'|'ERASURE', requestId: string };

export const DSRQueue = process.env.REDIS_URL ? new Queue<DSRJob>('dsr', connection) as any : null;

export async function enqueueDSR(job: DSRJob) {
  if (!process.env.REDIS_URL || process.env.FREE_MODE === 'true') {
    const { handleExportById, handleErasureById } = await import('./dsr.js');
    if (job.kind === 'EXPORT') return handleExportById(job.requestId);
    if (job.kind === 'ERASURE') return handleErasureById(job.requestId);
    return;
  }
  return (DSRQueue as any).add(job.kind.toLowerCase(), job, { removeOnComplete: true, removeOnFail: false });
}
