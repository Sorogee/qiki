import { Queue } from 'bullmq';
const haveRedis = !!process.env.REDIS_URL;
const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379/0' } };
export type SearchIndexJob = { action: 'upsert'|'delete'|'updateScore'|'updateCounts', postId: string };

const osEnabled = process.env.OPENSEARCH_ENABLED === 'true';

if (haveRedis) {
  export const SearchQueue = new Queue<SearchIndexJob>('search-index', connection);
} else {
  export const SearchQueue = {
    async add(_name: string, job: SearchIndexJob) {
      if (!osEnabled) return { id: 'inline-search-skip' };
      // If OpenSearch is enabled but Redis isn't, do best-effort inline
      const { osClient } = await import('../search/client.js');
      const { prisma } = await import('../db.js');
      if (!osClient) return { id: 'inline-search-no-client' };
      const p = await prisma.post.findUnique({ where: { id: job.postId }, include: { community: true, author: true, _count: { select: { comments: true } }, votes: true } });
      if (!p || (p as any).status !== 'VISIBLE') return { id: 'inline-search-skip' };
      const score = (p as any).votes?.length ? (p as any).votes.reduce((acc: number, v: any) => acc + (v.value || 0), 0) : 0;
      const doc = { id: p.id, title: p.title, body: p.body, url: p.url, communitySlug: (p as any).community?.slug, communityId: p.communityId, authorId: p.authorId, createdAt: p.createdAt, score, comments: (p as any)._count?.comments || 0 };
      try {
        if (job.action === 'delete') await (osClient as any).delete({ index: process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1', id: p.id }, { ignore: [404] } as any);
        else await (osClient as any).index({ index: process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1', id: p.id, document: doc, refresh: true } as any);
      } catch {}
      return { id: 'inline-search' };
    }
  } as any;
}
