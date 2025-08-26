import { prisma } from '../db.js';

/** Expand query terms with simple synonyms when using Postgres FTS (OPENSEARCH off). */
export async function expandWithSynonyms(q: string) {
  const os = process.env.OPENSEARCH_ENABLED === 'true';
  if (os) return q;
  const terms = q.split(/\s+/).filter(Boolean);
  const unique = new Set<string>(terms.map(t=>t.toLowerCase()));
  const syns = await prisma.synonym.findMany({ where: { term: { in: Array.from(unique) } } });
  for (const s of syns) {
    for (const v of (s.variants||[])) unique.add(v.toLowerCase());
  }
  return Array.from(unique).join(' ');
}
