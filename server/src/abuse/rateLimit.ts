import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../cache/redis.js';
import type { Request, Response, NextFunction } from 'express';
import { getIp } from '../utils/ip.js';
import { rateLimited } from '../metrics.js';

const factor = parseFloat(process.env.RATE_LIMIT_TRUSTED_MULTIPLIER || '1');

function limiter(points: number, durationSec: number, blockSec = 0) {
  return new RateLimiterRedis({
    storeClient: redis,
    points,
    duration: durationSec,
    blockDuration: blockSec,
    keyPrefix: 'rl'
  });
}

export const RL = {
  globalIp: limiter(100, 60),
  loginIp: limiter(10, 60, 60),
  loginId: limiter(8, 60, 300),
  registerIp: limiter(3, 60, 120),
  registerIpHour: limiter(10, 3600, 3600),
  postUserMin: limiter(5, 60, 120),
  postUserDay: limiter(50, 86400, 3600),
  commentUserMin: limiter(20, 60, 60),
  commentUserDay: limiter(500, 86400, 3600),
  voteUserMin: limiter(120, 60, 0),
  searchIpMin: limiter(30, 60, 10),
  mediaUserMin: limiter(30, 60, 60)
};

export async function consumeOr429(bucket: keyof typeof RL, key: string, trusted = false) {
  const l = RL[bucket];
  if (!l) return;
  const pts = trusted ? Math.ceil((l as any).points * factor) : (l as any).points;
  try {
    // rate-limiter-flexible doesn't support dynamic points directly; consume 1 and rely on increased points via multiplier
    await l.consume(key, 1);
  } catch (_e) {
    rateLimited.labels(bucket).inc();
    throw { status: 429, message: 'Too Many Requests' };
  }
}

// Convenience middlewares
export function rlIp(bucket: keyof typeof RL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await consumeOr429(bucket, getIp(req));
      next();
    } catch (e:any) { res.status(e.status||429).json({ error: e.message||'Too Many Requests' }); }
  };
}

export function rlUser(bucket: keyof typeof RL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = (req as any).user?.id;
    const key = id || getIp(req);
    try {
      const trusted = (req as any).user && (((req as any).user.role === 'ADMIN') || ((req as any).user.trustLevel === 'TRUSTED'));
      await consumeOr429(bucket, key, !!trusted);
      next();
    } catch (e:any) { res.status(e.status||429).json({ error: e.message||'Too Many Requests' }); }
  };
}


/** Free mode fallback: simple in-process token bucket (per instance). */
const INMEM = new Map<string, { tokens: number, ts: number }>();
async function consumeOr429Local(bucket: keyof typeof RL, key: string, trusted=false) {
  const conf = RL[bucket];
  const cap = Math.floor(conf.points * (trusted ? 2 : 1));
  const refillPerMs = conf.points / (conf.duration * 1000);
  const now = Date.now();
  const st = INMEM.get(key) || { tokens: cap, ts: now };
  const elapsed = now - st.ts;
  st.tokens = Math.min(cap, st.tokens + elapsed * refillPerMs);
  if (st.tokens < 1) throw new Error('429');
  st.tokens -= 1;
  st.ts = now;
  INMEM.set(key, st);
}
const _consumeOr429 = consumeOr429;
export async function consumeOr429(bucket: keyof typeof RL, key: string, trusted=false) {
  if (!process.env.REDIS_URL) return consumeOr429Local(bucket, key, trusted);
  return _consumeOr429(bucket, key, trusted);
}
