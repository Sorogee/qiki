const base = process.env.QW_UI_BASE || 'http://localhost:8080';
(async () => {
  try {
    const r = await fetch(base);
    if (!r.ok) throw new Error('ui !ok');
    const html = await r.text();
    if (!html.includes('QW_UI_OK')) throw new Error('marker not found');
    console.log('[E2E] ui OK');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
