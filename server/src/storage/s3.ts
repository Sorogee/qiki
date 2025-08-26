import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const FREE = (process.env.FREE_MODE || 'true').toLowerCase() === 'true';
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'server/var/uploads');

export const client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE
} as any);

function ensureLocalPath(key:string) {
  const p = path.resolve(LOCAL_DIR, key);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export async function putObject(bucket: string, key: string, body: Buffer | NodeJS.ReadableStream, contentType?: string) {
  if (FREE || !process.env.S3_BUCKET) {
    const p = ensureLocalPath(key);
    if (Buffer.isBuffer(body)) fs.writeFileSync(p, body);
    else await new Promise((resolve, reject) => { const ws = fs.createWriteStream(p); (body as any).pipe(ws).on('finish', resolve).on('error', reject); });
    return { ok: true };
  }
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: body as any, ContentType: contentType });
  return client.send(cmd);
}

export async function getObject(bucket: string, key: string) {
  if (FREE || !process.env.S3_BUCKET) {
    const p = ensureLocalPath(key);
    if (!fs.existsSync(p)) throw new Error('not_found');
    const stat = fs.statSync(p);
    const rs = fs.createReadStream(p);
    return { Body: rs, LastModified: stat.mtime };
  }
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return client.send(cmd) as any;
}

export async function getSignedGetURL(bucket: string, key: string, expiresSec: number) {
  if (FREE || !process.env.S3_BUCKET) {
    // In free mode, serve through /files (if public) or /api/media/file
    return `/files/${key.replace(/^public\//, '')}`;
  }
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: expiresSec });
}
