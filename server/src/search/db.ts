import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';

export async function pgSearchPosts(q: string, limit = 20) {
  // Use Postgres websearch_to_tsquery on title + body
  // Prisma doesn't support tsquery functions directly; use $queryRaw
  const sql = Prisma.sql;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT p.id, p.title, p.body, p."createdAt", p."communityId",
           c.slug AS "communitySlug", c.name AS "communityName",
           ts_rank_cd(setweight(to_tsvector('simple', coalesce(p.title,'')), 'A') ||
                      setweight(to_tsvector('simple', coalesce(p.body,'')), 'B'),
                      websearch_to_tsquery('simple', ${q})) AS rank
    FROM "Post" p
    JOIN "Community" c ON c.id = p."communityId"
    WHERE p.status = 'VISIBLE'::"PostStatus"
      AND (setweight(to_tsvector('simple', coalesce(p.title,'')), 'A') ||
           setweight(to_tsvector('simple', coalesce(p.body,'')), 'B')) @@ websearch_to_tsquery('simple', ${q})
    ORDER BY rank DESC, p."createdAt" DESC
    LIMIT ${Prisma.raw(String(limit))}
  `;
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    body: null,
    createdAt: r.createdAt,
    communitySlug: r.communitySlug,
    communityName: r.communityName,
    score: Math.round((Number(r.rank) || 0) * 100)
  }));
}
