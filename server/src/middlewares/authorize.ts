import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

export async function requireModForPost(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const postId = (req.params.postId || req.body.postId) as string;
  if (!postId) return res.status(400).json({ error: 'postId required' });
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { community: true } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (req.user.role === 'ADMIN') return next();
  const member = await prisma.communityMember.findFirst({ where: { userId: req.user.id, communityId: post.communityId, role: 'MODERATOR' } });
  if (!member) return res.status(403).json({ error: 'Moderator only' });
  next();
}

export async function requireModForComment(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const commentId = (req.params.commentId || req.body.commentId) as string;
  if (!commentId) return res.status(400).json({ error: 'commentId required' });
  const c = await prisma.comment.findUnique({ where: { id: commentId }, include: { post: true } });
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  if (req.user.role === 'ADMIN') return next();
  const p = await prisma.post.findUnique({ where: { id: c.postId } });
  if (!p) return res.status(404).json({ error: 'Post not found' });
  const member = await prisma.communityMember.findFirst({ where: { userId: req.user.id, communityId: p.communityId, role: 'MODERATOR' } });
  if (!member) return res.status(403).json({ error: 'Moderator only' });
  next();
}
