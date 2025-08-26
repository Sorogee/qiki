import type { Request } from 'express';
export function getIp(req: Request) {
  // Express 'trust proxy' enabled: req.ip respects X-Forwarded-For
  const ip = (req.ip || '').toString();
  if (ip) return ip;
  const ra = (req.socket && (req.socket.remoteAddress || '')) || '';
  return ra.replace('::ffff:', '');
}
