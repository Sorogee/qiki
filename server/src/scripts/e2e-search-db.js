const { suffix, logTo, registerUser, loginUser, createCommunity, createPost, BASE, headersWithAuth } = require('./e2e-util');

(async () => {
  const tag = `search-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);
    const auth = await loginUser(email, password);

    const slug = `e2e-${tag}`;
    await createCommunity(auth, slug, `Community ${tag}`);

    const phrase = `unique_phrase_${tag}`;
    await createPost(auth, slug, `Title ${tag}`, `Body includes ${phrase}`);

    const r = await fetch(`${BASE}/api/search?q=${encodeURIComponent(phrase)}`, { headers: headersWithAuth(auth) });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(`search failed: ${r.status} ${JSON.stringify(data)}`);
    const hit = JSON.stringify(data).includes(phrase);
    if (!hit) throw new Error('search did not return expected content');

    logTo('e2e-search-db.txt', { ok: true, tag });
    process.exit(0);
  } catch (err) {
    logTo('e2e-search-db.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
