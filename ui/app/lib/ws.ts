'use client';
export function connectWS(token: string, onMessage: (ev:any)=>void) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = API.replace(/^http/,'ws') + `/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
  return ws;
}
