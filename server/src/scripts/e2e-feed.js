const { suffix, logTo, registerUser, loginUser, createCommunity, createPost, BASE, headersWithAuth } = require('./e2e-util');

(async () => {
  const tag = `feed-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);
    const auth = await loginUser(email, password);
    const slug = `e2e-${tag}`;
    await createCommunity(auth, slug, `Community ${tag}`);
    await createPost(auth, slug, `T ${tag}`, `B ${tag}`);

    for (const sort of ['hot', 'new', 'top']) {
      const r = await fetch(`${BASE}/api/feed?sort=${sort}`, { headers: headersWithAuth(auth) });
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(`feed ${sort} failed: ${r.status} ${JSON.stringify(data)}`);
    }

    logTo('e2e-feed.txt', { ok: true, tag });
    process.exit(0);
  } catch (err) {
    logTo('e2e-feed.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
