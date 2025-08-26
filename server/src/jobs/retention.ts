import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

const DAYS = Number(process.env.EVIDENCE_RETENTION_DAYS || 90);
const PERIOD_MS = Number(process.env.RETENTION_SWEEP_MS || 6*60*60*1000);

export function startEvidenceRetentionJob() {
  async function sweep() {
    try {
      const cutoff = new Date(Date.now() - DAYS*24*60*60*1000);
      const { count } = await prisma.evidence.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (count) logger.info({ msg: 'evidence_retention_purge', count });
    } catch (e:any) {
      logger.warn({ msg: 'evidence_retention_error', err: String(e) });
    }
  }
  sweep().catch(()=>{});
  setInterval(sweep, PERIOD_MS).unref();
}
