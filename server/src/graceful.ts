import type { Server } from 'http';
import { logger } from './utils/logger.js';

type Closeable = { quit?: () => Promise<any> | any; disconnect?:() => Promise<any> | any; close?:()=>Promise<any>|any; end?:()=>Promise<any>|any };

export function enableGraceful(httpServer: Server, deps: Closeable[] = []) {
  const sockets = new Set<any>();
  httpServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  const shutdown = async (sig: string) => {
    logger.info({ msg: 'graceful_shutdown_start', signal: sig });
    httpServer.close(() => logger.info({ msg:'http_server_closed' }));
    // Stop keepalives so connections don't linger forever
    try { (httpServer as any).keepAliveTimeout = 5_000; } catch {}
    // End all open sockets after a grace period
    setTimeout(() => {
      for (const s of sockets) { try { s.end(); } catch {} }
      setTimeout(() => {
        for (const s of sockets) { try { s.destroy(); } catch {} }
      }, 2_000);
    }, 5_000);

    // Close deps
    for (const d of deps) {
      for (const m of ['quit','disconnect','close','end'] as const) {
        const fn:any = (d as any)[m];
        if (typeof fn === 'function') {
          try { await fn.call(d); } catch (e) { logger.warn({ msg:'graceful_dep_error', dep:m, err:String(e) }); }
        }
      }
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
