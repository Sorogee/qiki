import { Router } from 'express';
import { z } from 'zod';
import sharp from 'sharp';
import { getObject } from '../storage/s3.js';

const router = Router();
const BUCKET = process.env.S3_BUCKET as string;

router.get('/', async (req, res) => {
  const p = z.object({
    key: z.string(),
    w: z.coerce.number().min(1).max(4096).optional(),
    q: z.coerce.number().min(40).max(95).optional(),
    format: z.enum(['webp','avif','jpeg']).optional()
  }).safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: 'Invalid params' });

  try {
    const obj = await getObject(BUCKET || 'local', p.data.key);
    let transformer = sharp({ failOn: 'warning' as any }).rotate();
    if (p.data.w) transformer = transformer.resize({ width: p.data.w, withoutEnlargement: true, fit: 'inside' });
    const quality = p.data.q || 80;
    let ctype = 'image/webp';
    if (p.data.format === 'avif') { transformer = transformer.avif({ quality }); ctype = 'image/avif'; }
    else if (p.data.format === 'jpeg') { transformer = transformer.jpeg({ quality, mozjpeg: true }); ctype = 'image/jpeg'; }
    else { transformer = transformer.webp({ quality }); ctype = 'image/webp'; }

    res.setHeader('Content-Type', ctype);
    (obj as any).Body.pipe(transformer).pipe(res);
  } catch (e:any) {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
