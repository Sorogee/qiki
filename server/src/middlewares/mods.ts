import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export async function requireCommunityMod(req: any, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug || req.body.communitySlug || req.query.slug;
    if (!req.user?.id || !slug) return res.status(403).json({ error: 'forbidden' });
    const c = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
    if (!c) return res.status(404).json({ error: 'community_not_found' });
    const m = await prisma.communityMember.findFirst({ where: { communityId: c.id, userId: req.user.id, role: { in: ['MOD','OWNER'] as any } } });
    if (!m) return res.status(403).json({ error: 'not_mod' });
    (req as any).communityId = c.id;
    next();
  } catch (e) {
    res.status(500).json({ error: 'mod_check_failed' });
  }
}
