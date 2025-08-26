import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const httpRequests = new client.Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'Request duration seconds',
  labelNames: ['method','route','status'],
  buckets: [0.025,0.05,0.1,0.25,0.5,1,2,5,10]
});
export const httpInFlight = new client.Gauge({
  name: 'http_server_in_flight_requests',
  help: 'In-flight HTTP requests',
  labelNames: ['route']
});
export const httpErrors = new client.Counter({
  name: 'http_server_errors_total',
  help: 'HTTP 5xx responses',
  labelNames: ['route']
});

export function goldenSignals() {
  return function(req: Request, res: Response, next: NextFunction) {
    const route = (req.route && req.route.path) || req.path || 'unknown';
    const end = httpRequests.startTimer({ method: req.method, route, status: 'pending' as any });
    httpInFlight.inc({ route });
    res.on('finish', () => {
      end({ status: String(res.statusCode), method: req.method, route });
      httpInFlight.dec({ route });
      if (res.statusCode >= 500) httpErrors.inc({ route });
    });
    next();
  };
}
