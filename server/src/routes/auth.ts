import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { rlIp } from '../abuse/rateLimit.js';
import { getIp } from '../utils/ip.js';
import { rateLimited, abuseRejected } from '../metrics.js';
import { z } from 'zod';
import { prisma } from '../db.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signJwt } from '../utils/jwt.js';
import { signJwtWithJti } from '../utils/jwt2.js';
import { authLimiter } from '../middlewares/rate.js';
import { config, security } from '../config.js';
import { sendMail } from '../utils/email.js';
import { tplVerify, tplReset } from '../email/templates.js';
import { requireCaptchaFor } from '../abuse/middleware.js';

const router = Router();
const blockDisposable = String(process.env.DISPOSABLE_EMAILS_BLOCK || 'true') === 'true';
const disposableListPath = path.resolve(process.cwd(), 'src/abuse/disposableDomains.txt');
const disposableDomains = blockDisposable && fs.existsSync(disposableListPath) ? new Set(fs.readFileSync(disposableListPath,'utf-8').split(/\r?\n/).filter(Boolean)) : new Set<string>();
import { issueCsrfToken } from '../middlewares/csrf.js';

function clientIp(req: any) {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  return (xf.split(',')[0] || req.socket.remoteAddress || '0.0.0.0').toString();
}

function buildSessionCookie(token: string) {
  const parts = [
    `${security.cookieName}=${token}`,
    'HttpOnly',
    security.cookieSecure ? 'Secure' : '',
    `SameSite=${security.cookieSameSite}`,
    security.cookieDomain ? `Domain=${security.cookieDomain}` : '',
    'Path=/',
    // 7 days default
    `Max-Age=${7*24*3600}`
  ].filter(Boolean);
  return parts.join('; ');
}

const regSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteCode: z.string().optional(),
});

router.post('/register', requireCaptchaFor('register'), rlIp('registerIp'), rlIp('registerIpHour'), authLimiter, async (req, res) => {
  const parsed = regSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { username, email, password, inviteCode } = parsed.data;

  if (config.requireInvite) {
    if (!inviteCode) return res.status(403).json({ error: 'Invite required' });
    const inv = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!inv || (inv.expiresAt && inv.expiresAt < new Date()) || (inv.maxUses <= inv.useCount)) {
      return res.status(403).json({ error: 'Invalid invite' });
    }
  }

  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (exists) return res.status(409).json({ error: 'Username or email already exists' });

  const pw = await hashPassword(password);
  const user = await prisma.user.create({ data: { username, email, password: pw } });

  if (config.requireInvite && inviteCode) {
    await prisma.inviteCode.update({ where: { code: inviteCode }, data: { useCount: { increment: 1 }, usedById: user.id, usedAt: new Date() } });
  }

  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  await prisma.emailToken.create({ data: { token, type: 'VERIFY', userId: user.id, expiresAt: new Date(Date.now() + 48*3600*1000) } });
  const verifyUrl = `https://${process.env.EXTERNAL_DOMAIN || 'localhost'}/auth/verify?token=${token}`;
  const em = tplVerify(user.username, verifyUrl);
  await sendMail(user.email, em.subject, em.text, em.html);

  const { token: jwt, jti } = await signJwtWithJti({ sub: user.id, username: user.username, email: user.email });
  await prisma.deviceSession.create({ data: { userId: user.id, tokenId: jti, ip: getIp(req), ua: req.headers['user-agent'] || '' } });
  if (security.cookieSessions) res.setHeader('Set-Cookie', buildSessionCookie(jwt));
  res.json({ token: jwt, user: { id: user.id, username: user.username, email: user.email }, needsEmailVerify: true });
});

const loginSchema = z.object({ usernameOrEmail: z.string().min(3).max(100), password: z.string().min(8).max(100) });

router.post('/login', rlIp('loginIp'), authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const identifier = parsed.data.usernameOrEmail;
  const ip = clientIp(req);

  // block if too many recent failures for this identifier+ip
  const fiveMinAgo = new Date(Date.now() - 5*60*1000);
  const recentFails = await prisma.loginAttempt.count({ where: { createdAt: { gte: fiveMinAgo }, identifier, ip, success: false } });
  if (recentFails >= 10) return res.status(429).json({ error: 'Too many attempts, try later' });

  const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
  if (!user) {
    await prisma.loginAttempt.create({ data: { ip, identifier, success: false } });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.banned) return res.status(403).json({ error: 'Account banned' });
  if (user.lockedUntil && user.lockedUntil > new Date()) return res.status(423).json({ error: 'Account locked. Try later.' });

  const ok = await verifyPassword(user.password, parsed.data.password);
  if (!ok) {
    await prisma.loginAttempt.create({ data: { ip, identifier, success: false, userId: user.id } });
    const halfHour = new Date(Date.now() - 30*60*1000);
    const fails = await prisma.loginAttempt.count({ where: { userId: user.id, success: false, createdAt: { gte: halfHour } } });
    if (fails >= 20) {
      await prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 15*60*1000) } });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await prisma.loginAttempt.create({ data: { ip, identifier, success: true, userId: user.id } });
  const { token, jti } = await signJwtWithJti({ sub: user.id, username: user.username, email: user.email });
  await prisma.deviceSession.create({ data: { userId: user.id, tokenId: jti, ip: getIp(req), ua: req.headers['user-agent'] || '' } });
  if (security.cookieSessions) res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, emailVerified: user.emailVerified } });
});

router.get('/verify', async (req, res) => {
  const token = String(req.query.token || '');
  const t = await prisma.emailToken.findUnique({ where: { token } });
  if (!t || t.consumed || t.expiresAt < new Date() || t.type !== 'VERIFY') return res.status(400).json({ error: 'Invalid token' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { emailVerified: true } }),
    prisma.emailToken.update({ where: { token }, data: { consumed: true } }),
  ]);
  res.json({ ok: true });
});

router.post('/request-reset', authLimiter, async (req, res) => {
  const email = String(req.body.email || '');
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await prisma.emailToken.create({ data: { token, type: 'RESET', userId: user.id, expiresAt: new Date(Date.now() + 2*3600*1000) } });
    const url = `https://${process.env.EXTERNAL_DOMAIN || 'localhost'}/auth/reset?token=${token}`;
    const em2 = tplReset(user?.username || email, url);
    await sendMail(email, em2.subject, em2.text, em2.html);
  }
  res.json({ ok: true });
});

router.post('/reset', authLimiter, async (req, res) => {
  const token = String(req.body.token || '');
  const newPassword = String(req.body.password || '');
  const t = await prisma.emailToken.findUnique({ where: { token } });
  if (!t || t.consumed || t.expiresAt < new Date() || t.type !== 'RESET') return res.status(400).json({ error: 'Invalid token' });
  const pw = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { password: pw, passwordChangedAt: new Date() } }),
    prisma.emailToken.update({ where: { token }, data: { consumed: true } }),
  ]);
  res.json({ ok: true });
});

router.post('/logout', async (req, res) => {
  try {
    // Extract token from Authorization or cookie
    let token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    if (!token && req.headers.cookie) {
      const name = security.cookieName;
      const m = ('; ' + req.headers.cookie).match(new RegExp(';\\s*' + name + '=([^;]+)'));
      if (m) token = decodeURIComponent(m[1]);
    }

    // If we have a token, revoke just this device session by JTI
    if (token) {
      const { verifyJwt } = await import('../utils/jwt.js');
      const payload: any = verifyJwt(token);
      const jti = payload && payload.jti;
      if (jti) {
        await prisma.deviceSession.updateMany({ where: { tokenId: jti, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }

    // Clear cookie if cookie sessions are enabled
    if (security.cookieSessions) {
      const expired = new Date(0).toUTCString();
      const parts = [
        `${security.cookieName}=`,
        'Path=/',
        `Expires=${expired}`,
        'HttpOnly',
        security.cookieSecure ? 'Secure' : '',
        `SameSite=${security.cookieSameSite}`,
        security.cookieDomain ? `Domain=${security.cookieDomain}` : ''
      ].filter(Boolean);
      res.setHeader('Set-Cookie', parts.join('; '));
    }

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true });
  }
});
});

export default router;


router.get('/csrf', (req, res) => {
  const t = issueCsrfToken(req.user?.id);
  res.json({ token: t, expiresIn: 15 * 60 });
});
