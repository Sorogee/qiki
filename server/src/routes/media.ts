import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB || '10', 10);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_W = parseInt(process.env.MAX_IMAGE_W || '2000', 10);
const MAX_H = parseInt(process.env.MAX_IMAGE_H || '2000', 10);
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'server/var/uploads');
const PUBLIC_DIR = path.resolve(LOCAL_DIR, 'public');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

type Sniff = { ok: boolean; type?: 'jpeg'|'png'|'webp'|'gif'; reason?: string };
function sniff(buf: Buffer): Sniff {
  if (buf.length < 12) return { ok: false, reason: 'too_small' };
  // JPEG
  if (buf[0] === 0xFF && buf[1] === 0xD8) return { ok: true, type: 'jpeg' };
  // PNG
  if (buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4E && buf[3]===0x47) return { ok: true, type: 'png' };
  // WEBP (RIFF.WEBP)
  if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46 && buf[8]===0x57 && buf[9]===0x45 && buf[10]===0x42 && buf[11]===0x50) return { ok: true, type: 'webp' };
  // GIF
  const sig = buf.slice(0,6).toString('ascii');
  if (sig === 'GIF87a' || sig === 'GIF89a') return { ok: true, type: 'gif' };
  // SVG/polyglot
  const head = buf.slice(0, 512).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<svg') || head.includes('<script')) return { ok: false, reason: 'svg_or_script' };
  return { ok: false, reason: 'unknown_magic' };
}

router.post('/upload', requireAuth as any, upload.single('file'), async (req, res) => {
  try {
    const f = (req as any).file as Express.Multer.File;
    if (!f) return res.status(400).json({ error: 'file_required' });
    if (f.size > MAX_BYTES) return res.status(413).json({ error: 'too_large' });

    const sn = sniff(f.buffer);
    if (!sn.ok) return res.status(415).json({ error: 'unsupported', reason: sn.reason });

    // Transcode via sharp -> WEBP (strip metadata by default), clamp dimensions
    const img = sharp(f.buffer, { failOn: 'warning' as any, limitInputPixels: 40_000 * 40_000 });
    const meta = await img.metadata();
    const w = Math.min(meta.width || MAX_W, MAX_W);
    const h = Math.min(meta.height || MAX_H, MAX_H);
    const out = await img.rotate().resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

    const id = randomUUID().replace(/-/g,'');
    const key = `public/${id}.webp`;
    const p = path.resolve(PUBLIC_DIR, `${id}.webp`);
    fs.writeFileSync(p, out);
    const url = `/files/${id}.webp`;
    res.json({ ok: true, key, url, width: w, height: h });
  } catch (e:any) {
    res.status(500).json({ error: 'upload_failed', detail: String(e?.message || e) });
  }
});

// Image proxy: only allowed hosts, size-capped, transcode to WEBP
router.get('/proxy', async (req, res) => {
  try {
    const url = (req.query.url as string) || '';
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'bad_url' });
    const allow = (process.env.IMAGE_PROXY_ALLOW_HOSTS || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (!allow.length) return res.status(403).json({ error: 'proxy_disabled' });
    const u = new URL(url);
    if (!allow.includes(u.hostname)) return res.status(403).json({ error: 'host_not_allowed' });

    const r = await fetch(url, { redirect: 'follow' as any, signal: AbortSignal.timeout(8000) });
    const ctype = (r.headers.get('content-type') || '').toLowerCase();
    if (!r.ok) return res.status(502).json({ error: 'upstream_error', status: r.status });
    const reader = r.body!.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    const CAP = parseInt(process.env.IMAGE_PROXY_MAX_BYTES || '5242880', 10); // 5MB
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > CAP) return res.status(413).json({ error: 'too_large' });
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map(u=>Buffer.from(u)));
    const sn = sniff(buf);
    if (!sn.ok) return res.status(415).json({ error: 'unsupported', reason: sn.reason });
    const out = await sharp(buf, { failOn: 'warning' as any }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.send(out);
  } catch (e:any) {
    res.status(502).json({ error: 'proxy_failed', detail: String(e?.message || e) });
  }
});

export default router;
