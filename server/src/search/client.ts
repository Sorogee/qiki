import { Client } from '@opensearch-project/opensearch';
import { logger } from '../utils/logger.js';

const url = process.env.OPENSEARCH_URL;
export const enabled = !!url;
export const osClient = url ? new Client({ node: url }) : null;

export async function ping() {
  if (!osClient) return false;
  try {
    await osClient.ping();
    return true;
  } catch (e) {
    logger.warn({ msg: 'OpenSearch ping failed', err: String(e) });
    return false;
  }
}
