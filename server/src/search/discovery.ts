import { redis } from '../cache/redis.js';

const hasZset = !!(redis as any) && typeof (redis as any).zincrby === 'function' && typeof (redis as any).zrevrange === 'function' && typeof (redis as any).expire === 'function';

type TrendMaps = { queries: Map<string, number>, communities: Map<string, number> };
const mem: TrendMaps = { queries: new Map(), communities: new Map() };

const KEY_Q = 'search:trending:queries';
const KEY_C = 'search:trending:communities';
const TTL = 60 * 60 * 48; // 48h

function memIncr(kind: keyof TrendMaps, key: string, by = 1) {
  const m = mem[kind];
  m.set(key, (m.get(key) || 0) + by);
}
function memTop(kind: keyof TrendMaps, n = 10): string[] {
  return [mem[kind].entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k);
}

export async function bumpTrendingQuery(q: string, community?: string) {
  if (!q) return;
  if (hasZset) {
    await (redis as any).zincrby(KEY_Q, 1, q);
    await (redis as any).expire(KEY_Q, TTL);
    if (community) { await (redis as any).zincrby(KEY_C, 1, community); await (redis as any).expire(KEY_C, TTL); }
  } else {
    memIncr('queries', q, 1);
    if (community) memIncr('communities', community, 1);
  }
}

export async function bumpTrendingClick(target: { type: 'COMMUNITY', slug: string }) {
  if (target.type === 'COMMUNITY') {
    if (hasZset) { await (redis as any).zincrby(KEY_C, 1, target.slug); await (redis as any).expire(KEY_C, TTL); }
    else memIncr('communities', target.slug, 1);
  }
}

export async function topTrending(n = 10) {
  if (hasZset) {
    const queries = await (redis as any).zrevrange(KEY_Q, 0, n-1);
    const communities = await (redis as any).zrevrange(KEY_C, 0, n-1);
    return { queries, communities };
  }
  return { queries: memTop('queries', n), communities: memTop('communities', n) };
}

// Query expansion stub (synonyms integration kept simple)
export function expandQuery(q: string) {
  const qs = q.trim();
  return { expandedQuery: qs, applied: [] as string[] };
}

// Simple scoring wrapper for DB fallback
export function searchScore(rank: number) {
  // map ts_rank (0..1+) into a friendly score 0..100
  const s = Math.max(0, Math.min(1, rank));
  return Math.round(s * 100);
}
