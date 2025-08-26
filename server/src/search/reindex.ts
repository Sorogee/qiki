import { prisma } from '../db.js';
import { osClient, enabled as osEnabled } from './client.js';
import { toPlain } from './util.js';

const index = process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1';

export async function reindexAll(batch = 200) {
  if (!osEnabled || !osClient) {
    console.log('OpenSearch not configured; reindex skipped.');
    return;
  }
  let cursor: string | null = null;
  for (;;) {
    const rows = await prisma.post.findMany({
      where: { status: 'VISIBLE' as any },
      orderBy: { id: 'asc' },
      take: batch,
      skip: cursor ? 1 : 0,
      (cursor ? { cursor: { id: cursor } } : {}),
      include: { community: true, comments: { select: { id: true } } }
    });
    if (!rows.length) break;
    const body: any[] = [];
    for (const p of rows) {
      cursor = p.id;
      const plain = toPlain(p);
      body.push({ index: { _index: index, _id: p.id } });
      body.push({
        id: p.id,
        title: p.title,
        body: p.body || '',
        communityId: p.communityId,
        communitySlug: p.community?.slug,
        communityName: p.community?.name,
        createdAt: p.createdAt,
        commentCount: p.comments?.length || 0,
        plain
      });
    }
    if (body.length) await osClient.bulk({ body, refresh: false });
    console.log('Indexed', rows.length);
  }
  await osClient.indices.refresh({ index });
  console.log('Done.');
}

if (require.main === module) {
  reindexAll().catch(e => { console.error(e); process.exit(1); });
}
