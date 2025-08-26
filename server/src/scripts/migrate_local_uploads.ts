import fs from 'fs';
import path from 'path';
import { s3 } from '../storage/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const bucket = process.env.S3_BUCKET as string;
const localDir = path.resolve(process.cwd(), '../media/uploads');
async function run() {
  if (!fs.existsSync(localDir)) {
    console.log('No local uploads dir:', localDir);
    return;
  }
  const files: string[] = [];
  function walk(dir: string) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else files.push(p);
    }
  }
  walk(localDir);
  for (const f of files) {
    const rel = path.relative(localDir, f).replace(/\\/g,'/');
    const key = 'uploads/public/migrated/' + rel;
    const Body = fs.readFileSync(f);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body }));
    console.log('Uploaded', key);
  }
}
run().catch(e => { console.error(e); process.exit(1); });
