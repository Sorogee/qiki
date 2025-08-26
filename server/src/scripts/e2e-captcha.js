const { suffix, logTo, registerUser, loginUser, BASE } = require('./e2e-util');

(async () => {
  const tag = `captcha-${suffix()}`;
  try {
    // Try to fetch captcha; gracefully continue if not present
    let captcha = null;
    try {
      const r = await fetch(`${BASE}/auth/captcha`);
      if (r.ok) {
        const data = await r.json();
        if (typeof data?.a === 'number' && typeof data?.b === 'number') {
          const ans = data.op === '-' ? (data.a - data.b) : (data.a + data.b);
          captcha = { id: data.id || data.key || null, answer: ans };
        }
      }
    } catch {}

    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password, captcha);
    await loginUser(email, password);
    logTo('e2e-captcha.txt', { ok: true, tag });
    process.exit(0);
  } catch (err) {
    logTo('e2e-captcha.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
