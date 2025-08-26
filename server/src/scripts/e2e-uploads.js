const { suffix, logTo, loginUser, BASE, headersWithAuth } = require('./e2e-util');

function tinyPngBuffer() {
  // 1x1 PNG (transparent), base64 literal kept short
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBgUq9m2cAAAAASUVORK5CYII=';
  return Buffer.from(b64, 'base64');
}

(async () => {
  const tag = `upload-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    const reg = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!reg.ok) throw new Error(`register ${reg.status}`);
    const auth = await loginUser(email, password);

    const fd = new FormData();
    fd.append('file', new Blob([tinyPngBuffer()], { type: 'image/png' }), `e2e-${tag}.png`);
    const r = await fetch(`${BASE}/api/media/upload`, {
      method: 'POST',
      headers: { (auth.cookie ? { 'Cookie': auth.cookie } : {}) },
      body: fd
    });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(`upload failed: ${r.status} ${JSON.stringify(data)}`);

    logTo('e2e-uploads.txt', { ok: true, tag, res: data });
    process.exit(0);
  } catch (err) {
    logTo('e2e-uploads.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
