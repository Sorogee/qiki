import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// Default metrics
client.collectDefaultMetrics({ prefix: 'qikiworld_', labels: { app: 'server' } });

// HTTP histogram (seconds)
export const httpHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10]
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const route = (req.route && (req.baseUrl + (req.route.path || '') )) || req.path || 'unknown';
  res.on('finish', () => {
    const diffNs = Number(process.hrtime.bigint() - start);
    const sec = diffNs / 1e9;
    httpHistogram.labels(req.method, route, String(res.statusCode)).observe(sec);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

export const feedVariantServe = new client.Counter({
  name: 'feed_variant_serve_total',
  help: 'Feed responses by variant',
  labelNames: ['variant']
});

export const feedEvent = new client.Counter({
  name: 'feed_event_total',
  help: 'Client-side engagement events',
  labelNames: ['event']
});

export const feedDwell = new client.Histogram({
  name: 'feed_dwell_ms',
  help: 'Client-reported dwell time per post (ms)',
  buckets: [500, 1000, 2500, 5000, 10000, 30000, 60000]
});

export const rateLimited = new client.Counter({
  name: 'rate_limited_total',
  help: 'Requests blocked by rate limits',
  labelNames: ['bucket']
});

export const abuseRejected = new client.Counter({
  name: 'abuse_rejected_total',
  help: 'Requests rejected by abuse filters',
  labelNames: ['reason']
});

export const moderationAction = new client.Counter({
  name: 'moderation_actions_total',
  help: 'Moderation actions taken',
  labelNames: ['action']
});
