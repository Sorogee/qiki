import type { Request, Response, NextFunction } from 'express';

type Key = string;
type Bucket = { tokens: number; last: number };

const buckets = new Map<Key, Bucket>();

function nowMs() { return Date.now(); }

function takeToken(key: Key, ratePerMin: number, burst: number): boolean {
  const t = nowMs();
  const refillPerMs = ratePerMin / 60000; // tokens per ms
  const b = buckets.get(key) || { tokens: burst, last: t };
  const elapsed = t - b.last;
  b.tokens = Math.min(burst, b.tokens + elapsed * refillPerMs);
  b.last = t;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return true;
  } else {
    buckets.set(key, b);
    return false;
  }
}

export function rateLimit(opts: { keyBy: (req: Request) => string; ratePerMin: number; burst: number }) {
  const { keyBy, ratePerMin, burst } = opts;
  return function(req: Request, res: Response, next: NextFunction) {
    const k = keyBy(req);
    if (!k) return next();
    if (takeToken(k, ratePerMin, burst)) return next();
    res.status(429).json({ error: 'rate_limited' });
  };
}

// Convenience buckets
export const ipLimiter = (rpm = Number(process.env.RPM_IP || 60), burst = Number(process.env.RPM_IP_BURST || 30)) =>
  rateLimit({ keyBy: (req) => String(req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip'), ratePerMin: rpm, burst });

export const userLimiter = (rpm = Number(process.env.RPM_USER || 120), burst = Number(process.env.RPM_USER_BURST || 60)) =>
  rateLimit({ keyBy: (req) => (req as any).user?.id ? `u:${(req as any).user.id}` : '', ratePerMin: rpm, burst });

export const writeLimiter = rateLimit({
  keyBy: (req: any) => req.user?.id ? `w:${req.user.id}` : `wip:${req.ip}`,
  ratePerMin: Number(process.env.RPM_WRITE || 30),
  burst: Number(process.env.RPM_WRITE_BURST || 15),
});
