import { prisma } from './db.js';
import { sendToUser } from './realtime/ws.js';

export async function createNotification(userId: string, type: string, data: any) {
  const n = await prisma.notification.create({ data: { userId, type, data } });
  sendToUser(userId, { id: n.id, type, data, createdAt: n.createdAt });
  return n;
}
