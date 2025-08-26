import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { EventEmitter } from 'events';
import { verifyJwtWithJti } from '../utils/jwt2.js';
import { redis } from '../cache/redis.js';
import { logger } from '../utils/logger.js';

type Conn = WebSocket;
const conns = new Map<string, Set<Conn>>(); // userId -> sockets

const localBus = new EventEmitter();

function sendToUser(userId: string, data: any) {
  const set = conns.get(String(userId));
  if (!set) return;
  const payload = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

function handleEvent(ev: any) {
  if (!ev) return;
  if (ev.userId) {
    sendToUser(ev.userId, ev);
  } else {
    for (const uid of conns.keys()) sendToUser(uid, ev);
  }
}

export function publishBroadcast(ev: any) {
  const str = JSON.stringify(ev);
  if ((redis as any)?.publish) {
    (redis as any).publish('notify:broadcast', str);
  } else {
    localBus.emit('notify:broadcast', ev);
  }
}

export function createWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  // Subscribe to Redis or local bus
  const sub = (redis as any)?.duplicate ? (redis as any).duplicate() : null;
  if (sub && (sub as any).subscribe) {
    sub.subscribe('notify:broadcast', (err: any) => {
      if (err) logger.warn({ msg: 'ws_subscribe_err', err });
    });
    if ((sub as any).on) {
      (sub as any).on('message', (_chan: any, msg: any) => {
        try { handleEvent(JSON.parse(msg)); } catch (e) { logger.warn({ msg: 'ws_bad_message', err: String(e) }); }
      });
    }
  } else {
    localBus.on('notify:broadcast', handleEvent);
  }

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const token = url.searchParams.get('token') || '';
      const payload = await verifyJwtWithJti<any>(token);
      if (!payload) { ws.close(4401, 'unauthorized'); return; }
      const uid = String((payload as any).id || (payload as any).sub);
      let bag = conns.get(uid);
      if (!bag) { bag = new Set(); conns.set(uid, bag); }
      bag.add(ws);
      ws.on('close', () => {
        const s = conns.get(uid);
        if (!s) return;
        s.delete(ws);
        if (s.size === 0) conns.delete(uid);
      });
    } catch {
      ws.close(4401, 'unauthorized');
    }
  });

  logger.info({ msg: 'ws_ready' });
  return wss;
}
