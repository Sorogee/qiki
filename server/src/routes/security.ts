import { Router } from 'express';
import { z } from 'zod';
import base64url from 'base64url';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { authenticator } from 'otplib';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

const router = Router();
const RP_ID = process.env.WEBAUTHN_RP_ID || (process.env.DOMAIN || 'localhost');
const ORIGIN = process.env.WEBAUTHN_ORIGIN || (`https://${process.env.DOMAIN}` || 'http://localhost:3000');

function nowPlus(minutes: number) { return new Date(Date.now() + minutes*60*1000); }

router.get('/status', requireAuth as any, async (req: any, res) => {
  const sec = await prisma.userSecurity.findUnique({ where: { userId: req.user!.id } });
  const creds = await prisma.webAuthnCredential.count({ where: { userId: req.user!.id } });
  const sessions = await prisma.deviceSession.findMany({ where: { userId: req.user!.id, revokedAt: null }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ totpEnabled: !!sec?.totpEnabled, passkeys: creds, sessions });
});

// --- TOTP
router.post('/totp/start', requireAuth as any, async (req:any, res) => {
  const user = req.user!;
  const secret = authenticator.generateSecret();
  const label = encodeURIComponent(user.username || user.email || 'qiki');
  const issuer = encodeURIComponent('Qikiworld');
  const otpauth = authenticator.keyuri(label, issuer, secret);
  await prisma.userSecurity.upsert({ where: { userId: user.id }, update: { totpSecret: secret }, create: { userId: user.id, totpSecret: secret } });
  res.json({ secret, otpauth });
});

router.post('/totp/verify', requireAuth as any, async (req:any, res) => {
  const p = z.object({ token: z.string().min(6).max(8) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const sec = await prisma.userSecurity.findUnique({ where: { userId: req.user!.id } });
  if (!sec?.totpSecret) return res.status(400).json({ error: 'No secret' });
  const ok = authenticator.check(p.data.token, sec.totpSecret);
  if (!ok) return res.status(400).json({ error: 'Invalid code' });
  await prisma.userSecurity.update({ where: { userId: req.user!.id }, data: { totpEnabled: true } });
  res.json({ ok: true });
});

router.delete('/totp', requireAuth as any, async (req:any, res) => {
  await prisma.userSecurity.update({ where: { userId: req.user!.id }, data: { totpEnabled: false, totpSecret: null } }).catch(()=>{});
  res.json({ ok: true });
});

// --- WebAuthn register
router.get('/webauthn/register/options', requireAuth as any, async (req:any, res) => {
  const user = req.user!;
  const userHandle = base64url.encode(Buffer.from(user.id));
  await prisma.userSecurity.upsert({ where: { userId: user.id }, update: { webauthnUserHandle: userHandle }, create: { userId: user.id, webauthnUserHandle: userHandle } });
  const existing = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
  const options = generateRegistrationOptions({
    rpName: 'Qikiworld',
    rpID: RP_ID,
    userName: user.username || user.email,
    timeout: 60_000,
    attestationType: 'none',
    excludeCredentials: existing.map(c => ({ id: base64url.toBuffer(c.credentialId), type: 'public-key' })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  await prisma.userSecurity.update({ where: { userId: user.id }, data: { lastChallenge: options.challenge, lastChallengeAt: new Date() } });
  res.json(options);
});

router.post('/webauthn/register/verify', requireAuth as any, async (req:any, res) => {
  const user = req.user!;
  const sec = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
  if (!sec?.lastChallenge) return res.status(400).json({ error: 'No challenge' });
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: sec.lastChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
    if (!verification.verified || !verification.registrationInfo) return res.status(400).json({ error: 'Not verified' });
    const { credentialID, credentialPublicKey, counter, aaguid } = verification.registrationInfo;
    const credId = base64url.encode(Buffer.from(credentialID));
    await prisma.webAuthnCredential.create({ data: { userId: user.id, credentialId: credId, publicKey: base64url.encode(Buffer.from(credentialPublicKey)), counter, aaguid: aaguid || undefined } });
    await prisma.userSecurity.update({ where: { userId: user.id }, data: { lastChallenge: null } });
    res.json({ ok: true });
  } catch (e:any) {
    return res.status(400).json({ error: 'Verification failed' });
  }
});

// --- WebAuthn auth options
router.post('/webauthn/auth/options', async (req, res) => {
  const p = z.object({ usernameOrEmail: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const user = await prisma.user.findFirst({ where: { OR: [ { username: p.data.usernameOrEmail }, { email: p.data.usernameOrEmail } ] } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const creds = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
  const options = generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    allowCredentials: creds.map(c => ({ id: base64url.toBuffer(c.credentialId), type: 'public-key' })),
  });
  await prisma.userSecurity.upsert({ where: { userId: user.id }, update: { lastChallenge: options.challenge, lastChallengeAt: new Date() }, create: { userId: user.id, lastChallenge: options.challenge, lastChallengeAt: new Date() } });
  res.json({ options, userId: user.id });
});

export default router;
