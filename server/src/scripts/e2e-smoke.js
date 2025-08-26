const base = process.env.QW_API_BASE || 'http://localhost:3000';
(async () => {
  try {
    const r = await fetch(`${base}/api/health`);
    if (!r.ok) throw new Error('health !ok');
    const h = await r.json();
    if (!h.ok) throw new Error('health payload not ok');
    console.log('[E2E] health OK');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
