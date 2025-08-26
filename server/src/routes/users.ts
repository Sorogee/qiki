import sanitizeHtml from 'sanitize-html';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, username: true, email: true, bio: true, avatarUrl: true, role: true, emailVerified: true }
  });
  res.json(u);
});

const updateSchema = z.object({
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional()
});

router.post('/me', requireAuth, async (req, res) => {
  const p = updateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const bio = p.data.bio ? sanitizeHtml(p.data.bio, { allowedTags: [], allowedAttributes: {} }).slice(0,500) : undefined;
  const avatarUrl = p.data.avatarUrl && /^https?:\/\//i.test(p.data.avatarUrl) ? p.data.avatarUrl : undefined;
  const u = await prisma.user.update({
    where: { id: req.user!.id },
    data: { (bio !== undefined ? { bio } : {}), (avatarUrl !== undefined ? { avatarUrl } : {}) }
  });
  res.json({ ok: true, user: { id: u.id, username: u.username, bio: u.bio, avatarUrl: u.avatarUrl } });
});

export default router;
