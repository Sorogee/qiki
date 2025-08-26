import { Router } from 'express';
import { z } from 'zod';
import base64url from 'base64url';
import { prisma } from '../db.js';
import { verifyPassword } from '../utils/hash.js';
import { signJwtWithJti } from '../utils/jwt2.js';
import { authenticator } from 'otplib';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getIp } from '../utils/ip.js';

const router = Router();
const RP_ID = process.env.WEBAUTHN_RP_ID || (process.env.DOMAIN || 'localhost');
const ORIGIN = process.env.WEBAUTHN_ORIGIN || (`https://${process.env.DOMAIN}` || 'http://localhost:3000');

router.post('/login', async (req, res) => {
  const p = z.object({ usernameOrEmail: z.string(), password: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const user = await prisma.user.findFirst({ where: { OR: [ { username: p.data.usernameOrEmail }, { email: p.data.usernameOrEmail } ] } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await verifyPassword(p.data.password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const sec = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
  const hasTotp = !!sec?.totpEnabled && !!sec?.totpSecret;
  const passkeys = await prisma.webAuthnCredential.count({ where: { userId: user.id } });

  if (!hasTotp && passkeys === 0) {
    // Direct login, create session immediately
    const { token, jti } = await signJwtWithJti({ sub: user.id, username: user.username });
    await prisma.deviceSession.create({ data: { userId: user.id, tokenId: jti, ip: getIp(req), ua: req.headers['user-agent'] || '' } });
    return res.json({ token });
  }

  // Issue a challenge record (for TOTP or WebAuthn)
  const chall = await prisma.authChallenge.create({ data: { userId: user.id, type: 'login', expiresAt: new Date(Date.now()+10*60*1000) } });
  return res.json({ requires2fa: true, challengeId: chall.id, methods: [hasTotp ? 'totp' : null, passkeys>0 ? 'webauthn' : null].filter(Boolean) });
});

router.post('/login/complete', async (req, res) => {
  const p = z.object({ challengeId: z.string(), method: z.enum(['totp','webauthn']), totp?: z.string().optional(), response?: z.any().optional() }).safeParse(req.body as any);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  const chall = await prisma.authChallenge.findUnique({ where: { id: (req.body as any).challengeId } });
  if (!chall || chall.expiresAt < new Date()) return res.status(400).json({ error: 'Challenge expired' });
  const user = await prisma.user.findUnique({ where: { id: chall.userId } });
  if (!user) return res.status(400).json({ error: 'User not found' });

  if (p.data.method === 'totp') {
    const sec = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
    if (!sec?.totpSecret || !sec?.totpEnabled) return res.status(400).json({ error: 'TOTP not enabled' });
    const ok = authenticator.check((req.body as any).totp || '', sec.totpSecret);
    if (!ok) return res.status(400).json({ error: 'Invalid code' });
  } else {
    // webauthn
    const sec = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
    if (!sec?.lastChallenge) return res.status(400).json({ error: 'No challenge' });
    try {
      const verification = await verifyAuthenticationResponse({
        response: (req.body as any).response,
        expectedChallenge: sec.lastChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: undefined,
      });
      if (!verification.verified) return res.status(400).json({ error: 'Not verified' });
      // Update counter if we can find credential
      const credId = base64url.encode(Buffer.from((req.body as any).response.id || (verification as any).credentialID || ''));
      const cred = await prisma.webAuthnCredential.findFirst({ where: { userId: user.id, credentialId: credId } });
      if (cred) await prisma.webAuthnCredential.update({ where: { id: cred.id }, data: { lastUsedAt: new Date(), counter: (verification.authenticationInfo?.newCounter as any) || cred.counter } });
      await prisma.userSecurity.update({ where: { userId: user.id }, data: { lastChallenge: null } }).catch(()=>{});
    } catch (e:any) {
      return res.status(400).json({ error: 'Verification failed' });
    }
  }

  await prisma.authChallenge.delete({ where: { id: chall.id } }).catch(()=>{});
  const { token, jti } = await signJwtWithJti({ sub: user.id, username: user.username });
  await prisma.deviceSession.create({ data: { userId: user.id, tokenId: jti, ip: getIp(req), ua: req.headers['user-agent'] || '' } });
  return res.json({ token });
});

export default router;
