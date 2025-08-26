import type { Request, Response, NextFunction } from 'express';
import { newChallenge, verifyChallenge } from './captcha.js';
import { getTrust } from '../utils/trust.js';

export function getCaptcha(req: Request, res: Response) {
  const c = newChallenge();
  res.json({ id: c.id, prompt: c.prompt, ttlMs: Number(process.env.CAPTCHA_TTL_MS || 2*60*1000) });
}

// Middleware requiring captcha for unauth'd or 'new' trust
export function requireCaptchaFor(action: 'register'|'post'|'comment') {
  return async function(req: any, res: Response, next: NextFunction) {
    // Admin override
    if (process.env.CAPTCHA_REQUIRED === 'false') return next();

    const isAuthed = !!req.user?.id;
    if (!isAuthed) {
      // Unauthed flows always require captcha
      const ok = checkHeaders(req);
      if (!ok) return res.status(403).json({ error: 'captcha_required', action });
      return next();
    }
    // Authed: require for new/untrusted users, otherwise pass
    const t = await getTrust(req.user.id);
    if (t === 'new') {
      const ok = checkHeaders(req);
      if (!ok) return res.status(403).json({ error: 'captcha_required', action, trust: t });
    }
    return next();
  };
}

function checkHeaders(req: Request): boolean {
  const id = (req.headers['x-captcha-id'] || req.body?.captchaId) as string;
  const ansRaw = (req.headers['x-captcha-answer'] || req.body?.captchaAnswer) as any;
  const answer = typeof ansRaw === 'string' ? parseInt(ansRaw as string, 10) : Number(ansRaw);
  if (!id || Number.isNaN(answer)) return false;
  return verifyChallenge(id, answer);
}
