import sanitizeHtml from 'sanitize-html';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { writeLimiter } from '../middlewares/rate.js';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await prisma.community.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' }, take: 200 });
  res.json(rows);
});


const createSchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  about: z.string().max(500).optional(),
  rules: z.string().max(2000).optional(),
  nsfw: z.boolean().optional(),
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.community.findFirst({ where: { OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }] } });
  if (exists) return res.status(409).json({ error: 'Community exists' });

  const about = parsed.data.about ? sanitizeHtml(parsed.data.about, {
    allowedTags: ['b','i','em','strong','a','ul','ol','li','p','br'],
    allowedAttributes: { 'a': ['href','rel','target'] },
    allowedSchemes: ['http','https'],
    transformTags: {
      'a': (tagName:any, attribs:any) => {
        const href = attribs.href || '';
        if (/^javascript:/i.test(href)) return { tagName: 'span', text: '' };
        return {
  tagName: 'a',
  attribs: { ...attribs, rel: 'nofollow noopener noreferrer ugc', target: '_blank' }
};
      }
    }
  }).slice(0,500) : undefined;

  const rules = parsed.data.rules ? sanitizeHtml(parsed.data.rules, {
    allowedTags: ['b','i','em','strong','a','ul','ol','li','p','br'],
    allowedAttributes: { 'a': ['href','rel','target'] },
    allowedSchemes: ['http','https'],
    transformTags: {
      'a': (tagName:any, attribs:any) => {
        const href = attribs.href || '';
        if (/^javascript:/i.test(href)) return { tagName: 'span', text: '' };
        return {
  tagName: 'a',
  attribs: { ...attribs, rel: 'nofollow noopener noreferrer ugc', target: '_blank' }
};
      }
    }
  }).slice(0,2000) : undefined;

  const c = await prisma.community.create( data: { ...parsed.data, about, rules, creatorId: req.user!.id });
  await prisma.communityMember.create({ data: { communityId: c.id, userId: req.user!.id, role: 'OWNER' as any } });
  res.json({ ok: true, community: { id: c.id, slug: c.slug, name: c.name } });
});

export default router;
