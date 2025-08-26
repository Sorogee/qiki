// E2E for flairs + modmail minimal flow
const API = process.env.API || 'http://localhost:4000';
function log(step, data) { console.log(`\n[${step}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2)); }

async function register(usernamePrefix) {
  const rnd = Math.random().toString(36).slice(2,8);
  const username = `${usernamePrefix}_${rnd}`;
  const email = `${usernamePrefix}_${rnd}@example.com`;
  const password = `Passw0rd!${rnd}`;
  const cap = await fetch(`${API}/api/captcha/new`).then(r=>r.json());
  let r = await fetch(`${API}/auth/register`, { method:'POST', headers: { 'content-type':'application/json','x-captcha-id':cap.id,'x-captcha-answer': eval(cap.prompt.replace('= ?','')) }, body: JSON.stringify({ username, email, password }) });
  let j = await r.json();
  if (!r.ok) throw new Error(`register failed: ${r.status} ${JSON.stringify(j)}`);
  r = await fetch(`${API}/auth/login`, { method:'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ usernameOrEmail: username, password }) });
  j = await r.json();
  if (!r.ok) throw new Error(`login failed: ${r.status} ${JSON.stringify(j)}`);
  return { token: j.token, username };
}

function auth(t) { return { 'authorization': `Bearer ${t}`, 'content-type': 'application/json' }; }

async function main() {
  const { token } = await register('mod7');
  // Create community
  const slug = `mod-${Math.random().toString(36).slice(2,5)}`;
  const cap = await fetch(`${API}/api/captcha/new`).then(r=>r.json());
  let r = await fetch(`${API}/api/communities`, { method:'POST', headers: { auth(token), 'x-captcha-id':cap.id,'x-captcha-answer':eval(cap.prompt.replace('= ?','')) }, body: JSON.stringify({ name:`Mod ${slug}`, slug }) });
  let j = await r.json(); log('community_create', j);

  // Create flair
  r = await fetch(`${API}/api/communities/${slug}/flairs`, { method:'POST', headers: auth(token), body: JSON.stringify({ name:'Announcement', textColor:'#ffffff', bgColor:'#ff0000' }) });
  j = await r.json(); log('flair_create', j);

  // List flairs
  r = await fetch(`${API}/api/communities/${slug}/flairs`);
  j = await r.json(); log('flairs_list', j);

  // Modmail: create thread
  r = await fetch(`${API}/api/communities/${slug}/modmail`, { method:'POST', headers: auth(token), body: JSON.stringify({ subject:'Welcome', body:'Hello mods' }) });
  j = await r.json(); log('modmail_create', { thread:j.thread?.id });

  // Modmail: fetch messages
  r = await fetch(`${API}/api/communities/${slug}/modmail/${j.thread.id}`, { headers: auth(token) });
  let t = await r.json(); log('modmail_fetch', { messages: t.messages?.length });

  console.log("\\n✅ E2E mod features completed.");
}

main().catch(e => { console.error('E2E mod failed:', e); process.exit(1); });
