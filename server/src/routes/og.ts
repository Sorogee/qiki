import { Router } from 'express';
import sharp from 'sharp';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../db.js';

const router = Router();

const W = 1200, H = 630;

function svg(title: string, subtitle?: string) {
  const safeTitle = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }).slice(0, 140);
  const safeSub = subtitle ? sanitizeHtml(subtitle, { allowedTags: [], allowedAttributes: {} }).slice(0, 180) : '';
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial">
      <text x="60" y="190" font-size="64" font-weight="700" fill="#ffffff">${safeTitle}</text>
      ${safeSub ? `<text x="60" y="270" font-size="36" fill="#e2e8f0">${safeSub}</text>` : ''}
      <text x="60" y="${H-60}" font-size="28" fill="#bae6fd">qiki.world</text>
    </g>
  </svg>
  `.trim();
}

async function renderPng(title: string, subtitle?: string) {
  const s = svg(title, subtitle);
  const buf = await sharp(Buffer.from(s)).png().toBuffer();
  return buf;
}

// Community OG
router.get('/community', async (req, res) => {
  const slug = String(req.query.slug || '');
  if (!slug) return res.status(400).send('slug required');
  const c = await prisma.community.findUnique({ where: { slug }, select: { name: true, about: true } });
  if (!c) return res.status(404).send('not found');
  const png = await renderPng(c.name, c.about || `c/${slug}`);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.send(png);
});

// Post OG
router.get('/post', async (req, res) => {
  const id = String(req.query.id || '');
  if (!id) return res.status(400).send('id required');
  const p = await prisma.post.findUnique({ where: { id }, select: { title: true, community: { select: { slug: true, name: true } } } });
  if (!p) return res.status(404).send('not found');
  const png = await renderPng(p.title, p.community?.name || '');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.send(png);
});

export default router;
