import type { Request } from 'express';
import { prisma } from '../db.js';

export async function audit(req: Request, action: string, targetType: string, targetId?: string, metadata?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.id || null,
        action, targetType, targetId: targetId || null,
        ip: req.ip || null,
        userAgent: (req.headers['user-agent'] as string) || null,
        metadata
      }
    });
  } catch (e) {
    // swallow
    console.error('audit_log_error', e);
  }
}
