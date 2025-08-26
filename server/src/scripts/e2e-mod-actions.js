const { suffix, logTo, registerUser, loginUser, createCommunity, BASE, headersWithAuth } = require('./e2e-util');

(async () => {
  const tag = `mod-${suffix()}`;
  try {
    const email = `mod_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);
    const auth = await loginUser(email, password);

    const slug = `e2e-${tag}`;
    await createCommunity(auth, slug, `Community ${tag}`);

    // Flair (optional)
    let flairRes = null;
    try {
      const r = await fetch(`${BASE}/api/communities/test/flairs`, {
        method: 'POST',
        headers: headersWithAuth(auth),
        body: JSON.stringify({ community: slug, name: 'Test Flair', color: '#ffaa00' })
      });
      flairRes = { status: r.status, ok: r.ok };
    } catch {}
    // Modmail (optional)
    let modmailRes = null;
    try {
      const r = await fetch(`${BASE}/api/communities/test/modmail`, {
        method: 'POST',
        headers: headersWithAuth(auth),
        body: JSON.stringify({ community: slug, subject: `Hello ${tag}`, body: 'Ping' })
      });
      modmailRes = { status: r.status, ok: r.ok };
    } catch {}

    logTo('e2e-mod-actions.txt', { ok: true, tag, flairRes, modmailRes });
    process.exit(0);
  } catch (err) {
    logTo('e2e-mod-actions.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
