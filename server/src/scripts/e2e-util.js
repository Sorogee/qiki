const fs = require('fs');
const path = require('path');

const BASE = process.env.QW_API_BASE || 'http://localhost:3000';
const UI = process.env.QW_UI_BASE || 'http://localhost:8080';
const LOG_DIR = process.env.QW_LOG_DIR || path.join(process.cwd(), 'QW_LOG', 'STEP_12R_5', 'CHECKS');

function now() { return new Date().toISOString(); }
function suffix() { return Math.floor(Date.now()/1000).toString() + '-' + Math.floor(Math.random()*10000).toString().padStart(4,'0'); }

function logTo(file, data) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOG_DIR, file), typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

function headersWithAuth(auth) {
  const h = { 'Content-Type': 'application/json' };
  if (auth?.token) h['Authorization'] = `Bearer ${auth.token}`;
  if (auth?.cookie) h['Cookie'] = auth.cookie;
  return h;
}

async function parseSetCookie(res) {
  const sc = res.headers.get('set-cookie');
  if (!sc) return null;
  // pass through raw cookie header for subsequent requests
  return sc;
}

async function registerUser(email, password, captcha) {
  const body = { email, password };
  if (captcha?.id) body.captchaId = captcha.id;
  if (captcha?.answer !== undefined) body.captchaAnswer = captcha.answer;
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const cookie = await parseSetCookie(r);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`register failed: ${r.status} ${JSON.stringify(data)}`);
  return { cookie, data };
}

async function loginUser(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const cookie = await parseSetCookie(r);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`login failed: ${r.status} ${JSON.stringify(data)}`);
  const token = data?.token || data?.accessToken || null;
  return { token, cookie, data };
}

async function createCommunity(auth, slug, title) {
  const r = await fetch(`${BASE}/api/c`, {
    method: 'POST',
    headers: headersWithAuth(auth),
    body: JSON.stringify({ slug, title })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`create community failed: ${r.status} ${JSON.stringify(data)}`);
  return data;
}

async function createPost(auth, community, title, body) {
  const r = await fetch(`${BASE}/api/p`, {
    method: 'POST',
    headers: headersWithAuth(auth),
    body: JSON.stringify({ community, title, body })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`create post failed: ${r.status} ${JSON.stringify(data)}`);
  return data;
}

module.exports = {
  BASE, UI, LOG_DIR, now, suffix, logTo,
  registerUser, loginUser, createCommunity, createPost, headersWithAuth
};
