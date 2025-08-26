import crypto from 'crypto';
import type { Response, Request } from 'express';

export function hashBody(body: any) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto.createHash('sha1').update(json).digest('hex');
}

export function setCacheHeaders(res: Response, opts: { public?: boolean, sMaxAge?: number, swr?: number, tags?: string[], lastModified?: Date }) {
  const cc: string[] = [];
  if (opts.public) cc.push('public'); else cc.push('private');
  if (opts.sMaxAge != null) cc.push(`s-maxage=${opts.sMaxAge}`);
  if (opts.swr != null) cc.push(`stale-while-revalidate=${opts.swr}`);
  if (cc.length) res.setHeader('Cache-Control', cc.join(', '));
  if (opts.tags && opts.tags.length) res.setHeader('Surrogate-Key', opts.tags.join(' '));
  if (opts.lastModified) res.setHeader('Last-Modified', opts.lastModified.toUTCString());
}

export function maybe304(req: Request, res: Response, etag: string) {
  res.setHeader('ETag', `W/"${etag}"`);
  const inm = (req.headers['if-none-match'] || '') as string;
  if (inm && inm.replace(/W\//,'').replace(/"/g,'') === etag) {
    res.status(304).end();
    return true;
  }
  return false;
}
