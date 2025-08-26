import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { osClient, enabled as osEnabled } from '../search/client.js';
import { expandQuery, searchScore, bumpTrendingQuery, bumpTrendingClick, topTrending } from '../search/discovery.js';
import { hashBody, setCacheHeaders, maybe304 } from '../utils/conditional.js';
import { rlIp } from '../abuse/rateLimit.js';
import { pgSearchPosts } from '../search/db.js';

const router = Router();

router.get('/', rlIp('searchIpMin'), async (req, res) => {
  const raw = String(req.query.q || '').trim();
  const qexp = expandQuery(raw);
  const q = qexp.expandedQuery;
  const community = String(req.query.community || '');

  // bump trending query + community
  bumpTrendingQuery(q, community).catch(()=>{});

  // Try OpenSearch if configured
  if (osEnabled && osClient && q) {
    try {
      const result: any = await (osClient as any).search({
        index: process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1',
        body: {
          size: 20,
          query: {
            bool: {
              must: { query_string: { query: q, default_operator: 'AND', fields: ['title^3','body'] } },
              filter: [
                { term: { status: 'VISIBLE' } },
                (community ? [{ term: { communitySlug: community } }] : [])
              ]
            }
          },
          highlight: { fields: { title: {}, body: {} }, number_of_fragments: 2, fragment_size: 120 }
        }
      });
      const posts = (result.body?.hits?.hits || []).map((h: any) => ({
        id: h._source.id,
        title: h._source.title,
        body: undefined,
        createdAt: h._source.createdAt,
        communitySlug: h._source.communitySlug,
        communityName: h._source.communityName,
        score: searchScore(h._score || 0),
        highlight: h.highlight
      }));
      const payload = { posts, engine: 'opensearch' } as any;
      setCacheHeaders(res, { public: true, sMaxAge: 30, swr: 60, tags: ['search'], lastModified: new Date() });
      const etag = hashBody({ q, community, payload });
      if (maybe304(req, res, etag)) return;
      return res.json(payload);
    } catch (e) {
      // fall back to DB
    }
  }

  // DB fallback (Postgres full-text) or when q is empty
  let posts: any[] = [];
  if (q) posts = await pgSearchPosts(q, 20);
  else {
    // empty query: show recent posts
    posts = await prisma.post.findMany({
      where: { status: 'VISIBLE' as any },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, createdAt: true, body: false as any, community: { select: { slug: true, name: true } } }
    }).then(rows => rows.map(r => ({ id: r.id, title: r.title, body: null, createdAt: r.createdAt, communitySlug: (r as any).community.slug, communityName: (r as any).community.name, score: 0 })));
  }
  const payload = { posts, engine: 'db' } as any;
  setCacheHeaders(res, { public: true, sMaxAge: 15, swr: 60, tags: ['search'], lastModified: new Date() });
  const etag = hashBody({ q, community, payload });
  if (maybe304(req, res, etag)) return;
  return res.json(payload);
});

// Trending
router.get('/trending', async (_req, res) => {
  const t = await topTrending(10);
  res.json(t);
});

// Click tracking (optional)
router.post('/click', async (req, res) => {
  const p = z.object({ type: z.enum(['COMMUNITY']), slug: z.string().min(1).max(64) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });
  bumpTrendingClick({ type: p.data.type, slug: p.data.slug }).catch(()=>{});
  res.json({ ok: true });
});

export default router;
