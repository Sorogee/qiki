import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  requireInvite: (process.env.REQUIRE_INVITE || 'false').toLowerCase() === 'true',
  smtp: {
    host: process.env.SMTP_HOST || 'mailhog',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@qikiworld.example',
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  },
  csp: {
    // Comma-separated list of extra image hosts (e.g., cdn.example.com,images.example.org)
    imgHosts: (process.env.CSP_IMG_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean),
    connectHosts: (process.env.CSP_CONNECT_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean),
  }
};

export const security = {
  // Enable cookie-based session propagation (in addition to Authorization: Bearer).
  cookieSessions: (process.env.COOKIE_SESSIONS || 'false').toLowerCase() === 'true',
  // Name of the session cookie.
  cookieName: process.env.COOKIE_NAME || 'qid',
  // Use Secure cookies when NODE_ENV=production or COOKIE_SECURE=true
  cookieSecure: (process.env.COOKIE_SECURE || ((process.env.NODE_ENV || 'development') === 'production' ? 'true' : 'false')).toLowerCase() === 'true',
  // SameSite policy for cookies: 'Lax' | 'Strict' | 'None'
  cookieSameSite: (process.env.COOKIE_SAMESITE || 'Lax') as 'Lax'|'Strict'|'None',
  // Optional cookie domain (omit to default to host only)
  cookieDomain: process.env.COOKIE_DOMAIN || undefined
};
