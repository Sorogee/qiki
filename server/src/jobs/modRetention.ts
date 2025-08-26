import { prisma } from '../db.js';

export async function runModRetentionCleanup() {
  const now = new Date();
  const n = await prisma.evidence.deleteMany({ where: { purgeAfter: { lte: now } } });
  console.log('[mod-retention] deleted evidence rows:', (n as any).count || 0);
}

if (require.main === module) {
  runModRetentionCleanup().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
}
