const { suffix, logTo, registerUser, loginUser, BASE, headersWithAuth } = require('./e2e-util');

(async () => {
  const tag = `sess-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);

    const a = await loginUser(email, password); // session A
    const b = await loginUser(email, password); // session B

    // Both should access a protected endpoint
    async function protectedPing(auth) {
      const r = await fetch(`${BASE}/api/me`, { headers: headersWithAuth(auth) });
      return r.status;
    }
    const s1 = await protectedPing(a);
    const s2 = await protectedPing(b);
    if (s1 >= 400 || s2 >= 400) throw new Error('protected ping failed pre-logout');

    // Revoke current from session A
    const rLogout = await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: headersWithAuth(a) });
    if (!rLogout.ok) throw new Error(`logout failed: ${rLogout.status}`);

    // A should fail now, B should still work
    const s1b = await protectedPing(a);
    const s2b = await protectedPing(b);
    if (s1b < 400) throw new Error('revoked session still valid');
    if (s2b >= 400) throw new Error('other session incorrectly revoked');

    // Nuclear: revoke all
    const rAll = await fetch(`${BASE}/api/sessions/revoke_all`, { method: 'POST', headers: headersWithAuth(b) });
    if (!rAll.ok) throw new Error(`revoke_all failed: ${rAll.status}`);
    const s2c = await protectedPing(b);
    if (s2c < 400) throw new Error('revoke_all did not revoke others');

    logTo('e2e-sessions.txt', { ok: true, tag });
    process.exit(0);
  } catch (err) {
    logTo('e2e-sessions.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
