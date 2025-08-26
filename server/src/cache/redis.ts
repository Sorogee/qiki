import client from 'prom-client';

const useInmem = !process.env.REDIS_URL;
let RedisLib: any = null;
if (!useInmem) {
  // Lazy import to avoid bundlers complaining
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RedisLib = require('ioredis').default || require('ioredis');
}

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(...keys: string[]): Promise<number>;
  scanStream?(opts: { match?: string, count?: number }): AsyncIterableIterator<string[]>;
};

const hit = new client.Counter({ name: 'cache_hit_total', help: 'Cache hits', labelNames: ['key'] });
const miss = new client.Counter({ name: 'cache_miss_total', help: 'Cache misses', labelNames: ['key'] });
const store = new client.Counter({ name: 'cache_store_total', help: 'Cache stores', labelNames: ['key'] });
const inval = new client.Counter({ name: 'cache_invalidate_total', help: 'Cache invalidations', labelNames: ['prefix'] });

// In-memory fallback
const mem = new Map<string, { v: string, exp?: number }>();

function now() { return Date.now(); }
function getLabel(k:string){ return k.split(':',1)[0]; }

class InMem implements RedisLike {
  async get(key: string): Promise<string|null> {
    const rec = mem.get(key);
    if (!rec) return null;
    if (rec.exp && rec.exp < now()) { mem.delete(key); return null; }
    return rec.v;
  }
  async set(key: string, value: string, mode?: string, ttl?: number): Promise<any> {
    if (mode && typeof ttl === 'number' && (mode.toUpperCase() === 'EX' || mode.toUpperCase() === 'PX')) {
      const ms = mode.toUpperCase() === 'EX' ? ttl*1000 : ttl;
      mem.set(key, { v: value, exp: now() + ms });
    } else {
      mem.set(key, { v: value });
    }
    return 'OK';
  }
  async del(keys: string[]): Promise<number> {
    let n=0; for (const k of keys) { if (mem.delete(k)) n++; } return n;
  }
  async *scanStream(opts: { match?: string, count?: number } = {}) {
    const pat = (opts.match || '*').replace(/\*/g, '.*');
    const rx = new RegExp('^' + pat + '$');
    const batch: string[] = [];
    for (const k of mem.keys()) {
      if (rx.test(k)) { batch.push(k); if (batch.length >= (opts.count || 100)) { yield [batch]; batch.length=0; } }
    }
    if (batch.length) yield batch;
  }
}

export const redis: RedisLike = useInmem ? new InMem() : new (RedisLib)(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 3 });

export async function getJSON<T=any>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    if (val) { hit.labels(getLabel(key)).inc(); return JSON.parse(val) as T; }
    miss.labels(getLabel(key)).inc();
    return null;
  } catch { return null; }
}

export async function setJSON(key: string, value: any, ttlSec?: number) {
  try {
    const v = JSON.stringify(value);
    if (ttlSec) await redis.set(key, v, 'EX', ttlSec);
    else await redis.set(key, v);
    store.labels(getLabel(key)).inc();
  } catch {}
}

export async function del(key: string) {
  try { await (redis as any).del(key); } catch {}
}

// Scan & delete keys by prefix (best-effort)
export async function scanDel(prefix: string) {
  try {
    const stream = (redis as any).scanStream ? (redis as any).scanStream({ match: `${prefix}*`, count: 1000 }) : null;
    if (!stream) return;
    const del: string[] = [];
    for await (const keys of stream as any) {
      if (keys.length) del.push(...keys);
    }
    if (del.length) await (redis as any).del(...del);
    inval.labels(prefix).inc();
  } catch {}
}

// Cache key helpers
export const keys = {
  feed: (community?: string) => `feed:${community || 'all'}`,
  user: (username: string) => `user:${username}`,
  communities: () => `communities:list`,
};
