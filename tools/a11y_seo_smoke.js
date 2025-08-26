// Basic A11y/SEO smoke: check title, canonical, lang, skip link presence
const http = require('http');

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function fetchText(url) {
  const res = await fetch(url);
  return res.text();
}

async function check(urlPath) {
  const html = await fetchText(`${SITE}${urlPath}`);
  const ok = {
    title: /<title>.+<\/title>/i.test(html),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    lang: /<html[^>]+lang=/i.test(html),
    skip: /class=["'][^"']*skip-link[^"']*["']/i.test(html),
  };
  console.log(`[${urlPath}]`, ok);
}

(async () => {
  for (const p of ['/', '/search', '/submit']) {
    try { await check(p); } catch (e) { console.log(`[${p}] failed`, e.message); }
  }
})().catch(e=>{ console.error(e); process.exit(1); });
