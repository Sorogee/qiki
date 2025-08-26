import type { Request, Response, NextFunction } from 'express';
import { signJwt, verifyJwt } from '../utils/jwt.js';

/**
 * Issue a short-lived CSRF token (JWT with {csrf:true}) that the browser must
 * echo back in `X-CSRF-Token` for write methods. This is *double-submit* style
 * (it is not stored server-side), aligned with OWASP CSRF guidance.
 */
export function issueCsrfToken(userId?: string) {
  return signJwt({ csrf: true, uid: userId || 'anon' }, '15m');
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (!isWrite) return next();

  // Only enforce for browser contexts to avoid breaking API clients
  const hasOrigin = typeof req.headers.origin === 'string' && req.headers.origin.length > 0;
  const secFetchSite = String(req.headers['sec-fetch-site'] || '');
  const looksBrowser = hasOrigin || !!secFetchSite;

  if (!looksBrowser) return next();

  const token = String(req.headers['x-csrf-token'] || '');
  const data = token ? verifyJwt<{ csrf?: boolean, uid?: string }>(token) : null;
  if (!data || !data.csrf) return res.status(403).json({ error: 'CSRF token missing/invalid' });
  return next();
}
