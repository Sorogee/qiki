import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function stableHash(input: string) {
  return crypto.createHash('sha256').update(input).digest().readUInt32BE(0);
}

// Assigns a feed variant: 'hot' (50%), 'new' (25%), 'top' (25%)
// Respect explicit ?sort= and ?exp= overrides.
export function assignFeedExperiment(req: Request, res: Response, next: NextFunction) {
  const qSort = String((req.query.sort || '')).toLowerCase();
  if (qSort === 'hot' || qSort === 'new' || qSort === 'top') {
    (req as any).feedVariant = qSort;
    res.setHeader('X-Feed-Exp', `manual:${qSort}`);
    return next();
  }

  const explicit = String((req.query.exp || '')).toLowerCase();
  if (explicit === 'hot' || explicit === 'new' || explicit === 'top') {
    (req as any).feedVariant = explicit;
    res.setHeader('X-Feed-Exp', `override:${explicit}`);
    return next();
  }

  const basis = req.user?.id || (req.headers['x-request-id'] as string) || (req.ip + (req.headers['user-agent'] || ''));
  const h = stableHash(basis);
  let variant = 'hot';
  const bucket = h % 100;
  if (bucket < 50) variant = 'hot';
  else if (bucket < 75) variant = 'new';
  else variant = 'top';
  (req as any).feedVariant = variant;
  res.setHeader('X-Feed-Exp', variant);
  next();
}
