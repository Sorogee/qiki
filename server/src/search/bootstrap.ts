import { osClient } from './client.js';

const index = process.env.OPENSEARCH_INDEX_POSTS || 'qiki-posts-v1';

async function run() {
  if (!osClient) { console.error('OpenSearch not configured'); process.exit(1); }

  // Create template with analyzers & mappings
  const templateName = 'qiki-posts-template';
  await osClient.indices.putIndexTemplate({
    name: templateName,
    body: {
      index_patterns: ['qiki-posts-*','qiki-posts-v*'],
      template: {
        settings: {
          analysis: {
            analyzer: {
              english_with_shingles: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase','english_stop','english_stemmer','shingle']
              },
              edge_en: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase','edge_ngram']
              }
            },
            filter: {
              english_stop: { type: 'stop', stopwords: '_english_' },
              english_stemmer: { type: 'stemmer', name: 'english' },
              shingle: { type: 'shingle', min_shingle_size: 2, max_shingle_size: 3 },
              edge_ngram: { type: 'edge_ngram', min_gram: 2, max_gram: 15 }
            }
          }
        },
        mappings: {
          dynamic: 'strict',
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text', analyzer: 'english_with_shingles', fields: { keyword: { type:'keyword' }, suggest: { type:'text', analyzer:'edge_en' } } },
            body:  { type: 'text', analyzer: 'english_with_shingles' },
            url:   { type: 'keyword', ignore_above: 2048 },
            authorUsername: { type: 'keyword' },
            communitySlug:  { type: 'keyword' },
            communityName:  { type: 'keyword' },
            createdAt: { type: 'date' },
            score:     { type: 'integer' },
            commentCount: { type: 'integer' }
          }
        }
      },
      priority: 200
    }
  });

  // Ensure index exists
  const exists = await osClient.indices.exists({ index });
  if (!exists.body) {
    await osClient.indices.create({ index });
    console.log('Created index', index);
  } else {
    console.log('Index exists', index);
  }
}
run().catch(e => { console.error(e); process.exit(1); });
