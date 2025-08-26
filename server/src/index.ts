import health from './routes/health';
import path from 'path';
import './tracing.js';
import http from 'http';
import './observability/otel.js';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import { goldenSignals } from './middlewares/golden.js';
import { requestId } from './middlewares/reqid.js';
import { metricsMiddleware, metricsHandler } from './metrics.js';
import { requireCsrf } from './middlewares/csrf.js';
import { config } from './config.js';
import modRoutes from './routes/mod.js';
import modqueueRoutes from './routes/modqueue.js';
import adminRoutes from './routes/admin.js';
import auth2Routes from './routes/auth2.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import communitiesRoutes from './routes/communities.js';
import postsRoutes from './routes/posts.js';
import commentsRoutes from './routes/comments.js';
import feedRoutes from './routes/feed.js';
import searchRoutes from './routes/search.js';
import mediaRoutes from './routes/media.js';
import imagesRoutes from './routes/images.js';
import notifRoutes from './routes/notifications.js';
import dsrRoutes from './routes/dsr.js';
import sessionsRoutes from './routes/sessions.js';
import securityRoutes from './routes/security.js';
import savedSearchRoutes from './routes/saved-searches.js';
import flairsRoutes from './routes/flairs.js';
import modmailRoutes from './routes/modmail.js';
import auditRoutes from './routes/audit.js';
import captchaRoutes from './routes/captcha.js';
import ogRoutes from './routes/og.js';
import healthRoutes from './routes/health.js';
import devRoutes from './routes/dev.js';

const app = express();
app.set('trust proxy', 1);

// JSON/body limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestId);
app.use(compression());
app.use((await import('./abuse/rateLimit.js')).rlIp('globalIp'));
app.use(metricsMiddleware);
app.use(requireCsrf);
app.use(pinoHttp({ logger, genReqId: (req,res)=> (req as any).requestId }));

// Helmet with tight CSP
const imgHosts = (config.csp.imgHosts || []).map(h => h.replace(/^https?:\/\//, ''));
const connectHosts = (config.csp.connectHosts || []).map(h => h.replace(/^https?:\/\//, ''));
const imgSrc = ["'self'", 'data:', 'blob:', ...imgHosts.map(h => `https://${h}`), ...imgHosts.map(h => `http://${h}`)];
const connectSrc = ["'self'", ...connectHosts.map(h => `https://${h}`), ...connectHosts.map(h => `http://${h}`)];
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      connectSrc,
      imgSrc,
      mediaSrc: imgSrc,
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Static files for uploads (free mode local storage)
import fs from 'fs';
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'server/var/uploads/public');
fs.mkdirSync(LOCAL_DIR, { recursive: true });
app.use('/files', express.static(LOCAL_DIR, { immutable: true, maxAge: '365d' }));

// Metrics route
app.get('/metrics', metricsHandler);
app.use(goldenSignals);

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/dsr', dsrRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/captcha', captchaRoutes);
app.use('/api/og', ogRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/communities/:slug/flairs', flairsRoutes);
app.use('/api/communities/:slug/modmail', modmailRoutes);


app.use('/api/mod', modRoutes);
app.use('/api/modqueue', modqueueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/auth2', auth2Routes);

// 404

app.use('/api/mod', modRoutes);
app.use('/api/modqueue', modqueueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/auth2', auth2Routes);

// Start HTTP+WS

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
const httpServer = http.createServer(app);
import('./realtime/ws.js').then(m => m.createWebSocketServer(httpServer));
import('./jobs/retention.js').then(m => m.startEvidenceRetentionJob());
import('./jobs/digest.js').then(m => m.startDigestJob());
httpServer.listen(config.port, () => {
  console.log(`Qikiworld API (HTTP+WS) running on :${config.port}`);
});
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/auth/csrf', (_req, res) => res.json({ token: 'dev-csrf-token', expiresIn: 900 }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
