if (!process.env.REDIS_URL) { console.log('[worker] REDIS_URL not set — worker disabled.'); process.exit(0); }
import { logger } from '../utils/logger.js';
import '../tracing.js';
import { Worker } from 'bullmq';
import express from 'express';
import client from 'prom-client';
import { sendMail } from '../utils/email.js';
import { prisma } from '../db.js';
import modRoutes from './routes/mod.js';
import modqueueRoutes from './routes/modqueue.js';
import adminRoutes from './routes/admin.js';
import auth2Routes from './routes/auth2.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
const connection = { connection: { url: redisUrl } };

const jobsProcessed = new client.Counter({ name: 'queue_jobs_processed_total', help: 'Processed jobs', labelNames: ['queue','name','status'] });
const jobsActive = new client.Gauge({ name: 'queue_jobs_active', help: 'Active jobs', labelNames: ['queue'] });

new Worker('email', async job => {
  try {
    const { to, subject, text, html } = job.data as any;
    await sendMail(to, subject, text, html);
    jobsProcessed.labels('email', job.name, 'ok').inc();
  } catch (e) {
    jobsProcessed.labels('email', job.name, 'error').inc();
    throw e;
  }
}, connection).on('active', () => jobsActive.labels('email').inc())
  .on('completed', () => jobsActive.labels('email').dec())
  .on('failed', () => jobsActive.labels('email').dec());

new Worker('notify', async job => {
  const { userId, type, data } = job.data as any;
  // Example: could send an email for notifications if user has emailVerified
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u?.emailVerified && u.email) {
      await sendMail(u.email, `New ${type} on your post`, JSON.stringify(data));
    }
    jobsProcessed.labels('notify', job.name, 'ok').inc();
  } catch (e) {
    jobsProcessed.labels('notify', job.name, 'error').inc();
    throw e;
  }
}, connection).on('active', () => jobsActive.labels('notify').inc())
  .on('completed', () => jobsActive.labels('notify').dec())
  .on('failed', () => jobsActive.labels('notify').dec());

// Expose /metrics for Prometheus
const app = express();
client.collectDefaultMetrics({ prefix: 'qikiworld_worker_' });
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
const port = process.env.WORKER_METRICS_PORT ? parseInt(process.env.WORKER_METRICS_PORT,10) : 4001;
app.use('/auth2', auth2Routes);
app.use('/api/admin', adminRoutes);
app.use('/api/modqueue', modqueueRoutes);
app.use('/api/mod', modRoutes);
app.listen(port, () => console.log('Worker metrics on :' + port));


import { Worker } from 'bullmq';
import { osClient } from '../search/client.js';
import { prisma } from '../db.js';
import { toPlain } from '../search/util.js';

const indexName = process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1';

new Worker('search-index', async job => {
  if (!osClient) return;
  const { action, postId } = job.data as any;
  if (action === 'delete') {
    await osClient.delete({ index: indexName, id: postId }, { ignore: [404] } as any);
    return;
  }
  const p = await prisma.post.findUnique({ where: { id: postId }, include: { author: true, community: true, _count: { select: { comments: true } }, votes: true } });
  if (!p || (p as any).status !== 'VISIBLE') return;
  const score = p.votes.reduce((acc, v) => acc + (v.type === 'UP' ? 1 : -1), 0);
  const doc = {
    id: p.id,
    title: toPlain(p.title || ''),
    body: toPlain(p.body || ''),
    url: p.url || undefined,
    authorUsername: p.author.username,
    communitySlug: p.community.slug,
    communityName: p.community.name,
    createdAt: p.createdAt,
    score,
    commentCount: p._count.comments
  };
  await osClient.index({ index: indexName, id: p.id, body: doc, refresh: false });
}, { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } });

import { Worker } from 'bullmq';
import { s3, getObject, copy, del } from '../storage/s3.js';
import { prisma } from '../db.js';
import clamd from 'clamdjs';

const BUCKET = process.env.S3_BUCKET as string;
const CDN = process.env.MEDIA_CDN_BASE || '';
const clamHost = process.env.CLAMAV_HOST || 'clamav';
const clamPort = parseInt(process.env.CLAMAV_PORT || '3310', 10);

const clam = clamd.createScanner(clamHost, clamPort);

new Worker('virus-scan', async job => {
  const { uploadId, key } = job.data as any;
  const up = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!up) return;

  // stream object to clamd via INSTREAM
  const obj = await getObject(BUCKET, key);
  const stream: any = obj.Body as any;
  const result = await clamd.ping(clamHost, clamPort).then(() => clamd.scanStream(stream, { host: clamHost, port: clamPort }));

  if (result.indexOf('FOUND') !== -1) {
    await prisma.upload.update({ where: { id: uploadId }, data: { status: 'REJECTED', error: 'Malware detected' } });
    await del(BUCKET, key).catch(()=>{});
    return;
  }

  const publicKey = key.replace('incoming/', 'public/');
  await copy(BUCKET, key, publicKey);
  await del(BUCKET, key).catch(()=>{});
  await prisma.upload.update({ where: { id: uploadId }, data: { status: 'APPROVED' } });
}, { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } });


// Graceful shutdown for worker (stop accepting new jobs)
process.on('SIGTERM', () => setTimeout(() => process.exit(0), 2000));
process.on('SIGINT', () => setTimeout(() => process.exit(0), 2000));

import './digest.js';

import './dsr.js';

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/auth/csrf', (_req, res) => res.json({ token: 'dev-csrf-token', expiresIn: 900 }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
