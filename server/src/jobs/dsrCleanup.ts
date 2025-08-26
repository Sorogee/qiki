import fs from 'node:fs';
import path from 'node:path';

const OUTDIR = process.env.DSR_DIR || path.resolve(process.cwd(), 'var/dsr');
const DAYS = parseInt(process.env.DSR_RETENTION_DAYS || '30', 10);

export async function runDsrCleanup() {
  try {
    const now = Date.now();
    if (!fs.existsSync(OUTDIR)) return;
    const files = await fs.promises.readdir(OUTDIR);
    for (const f of files) {
      const p = path.join(OUTDIR, f);
      const st = await fs.promises.stat(p);
      if (st.isFile() && now - st.mtimeMs > DAYS*24*60*60*1000) {
        await fs.promises.unlink(p).catch(()=>{});
      }
    }
    console.log('[dsr-cleanup] done');
  } catch (e) {
    console.error('[dsr-cleanup] error', e);
  }
}

if (require.main === module) {
  runDsrCleanup().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
}
