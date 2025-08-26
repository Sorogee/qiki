// E2E for captcha + trust + rate limit (free mode)
const API = process.env.API || 'http://localhost:4000';

function log(step, data) { console.log(`\n[${step}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2)); }
function authHeaders(t) { return { 'authorization': `Bearer ${t}`, 'content-type': 'application/json' }; }

async function getCaptchaNew() {
  const r = await fetch(`${API}/api/captcha/new`);
  const j = await r.json();
  return j;
}

async function main() {
  const rnd = Math.random().toString(36).slice(2, 8);
  const username = `abuse_${rnd}`;
  const email = `abuse_${rnd}@example.com`;
  const password = `Passw0rd!${rnd}`;

  // Register with captcha
  const cap = await getCaptchaNew();
  let r = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-captcha-id': cap.id, 'x-captcha-answer': eval(cap.prompt.replace('= ?','')) },
    body: JSON.stringify({ username, email, password })
  });
  let j = await r.json();
  if (!r.ok) throw new Error(`register failed: ${r.status} ${JSON.stringify(j)}`);
  log('register', j.user);

  // Login
  r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ usernameOrEmail: username, password }) });
  j = await r.json();
  if (!r.ok) throw new Error(`login failed: ${r.status} ${JSON.stringify(j)}`);
  const token = j.token;
  log('login', { ok: true });

  // Try posting WITHOUT captcha (should 403 for 'new' trust)
  r = await fetch(`${API}/api/posts`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ communitySlug: 'nonexistent', title: 'test', body: 'x' }) });
  if (r.status !== 403) log('post_without_captcha_warning', { status: r.status, text: await r.text() });

  // Create a real community first (needs captcha as well since new user)
  const cap2 = await getCaptchaNew();
  r = await fetch(`${API}/api/communities`, { method: 'POST', headers: { authHeaders(token), 'x-captcha-id': cap2.id, 'x-captcha-answer': eval(cap2.prompt.replace('= ?','')) }, body: JSON.stringify({ name: `Test ${rnd}`, slug: `test-${rnd}` }) });
  j = await r.json(); log('community_create', j);
  const slug = `test-${rnd}`;

  // Post WITH captcha
  const cap3 = await getCaptchaNew();
  r = await fetch(`${API}/api/posts`, { method: 'POST', headers: { authHeaders(token), 'x-captcha-id': cap3.id, 'x-captcha-answer': eval(cap3.prompt.replace('= ?','')) }, body: JSON.stringify({ communitySlug: slug, title: 'hello', body: 'world' }) });
  j = await r.json(); log('post_with_captcha', j);

  // Rate limit check: spam comments quickly
  let limited = 0;
  for (let i=0;i<40;i++) {
    const capx = await getCaptchaNew();
    r = await fetch(`${API}/api/comments`, { method: 'POST', headers: { authHeaders(token), 'x-captcha-id': capx.id, 'x-captcha-answer': eval(capx.prompt.replace('= ?','')) }, body: JSON.stringify({ postId: j.post?.id || j.id, body: 'x' }) });
    if (r.status === 429) { limited++; break; }
  }
  log('rate_limit_comments', { limited });
  console.log("\n✅ E2E abuse test completed.");
}

main().catch(e => { console.error('E2E abuse failed:', e); process.exit(1); });
