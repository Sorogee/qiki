const { suffix, logTo, registerUser, loginUser, BASE } = require('./e2e-util');

(async () => {
  const tag = `digest-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);
    const auth = await loginUser(email, password);

    const r = await fetch(`${BASE}/api/dev/digest?period=daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', (auth.cookie ? { 'Cookie': auth.cookie } : {}) }
    });
    if (!r.ok) throw new Error(`digest trigger failed: ${r.status}`);

    logTo('e2e-digest.txt', { ok: true, tag });
    process.exit(0);
  } catch (err) {
    logTo('e2e-digest.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
