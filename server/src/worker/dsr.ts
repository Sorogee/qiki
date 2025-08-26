import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../db.js';

const OUTDIR = process.env.DSR_DIR || path.resolve(process.cwd(), 'var/dsr');

function ensureDir() { fs.mkdirSync(OUTDIR, { recursive: true }); }

async function safeJSON(file: string, data: any) {
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

export async function handleExportById(requestId: string) {
  const r = await prisma.dSRRequest.findUnique({ where: { id: requestId } }) as any;
  if (!r) return;
  await prisma.dSRRequest.update({ where: { id: r.id }, data: { status: 'PROCESSING' } });
  const userId = r.userId;

  ensureDir();
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const dir = path.join(OUTDIR, `${userId}_${ts}`);
  fs.mkdirSync(dir, { recursive: true });

  // Collect data
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const profile = user;
  const posts = await prisma.post.findMany({ where: { authorId: userId } });
  const comments = await prisma.comment.findMany({ where: { authorId: userId } });
  const votes = await prisma.vote.findMany({ where: { userId } }).catch(()=>[]);
  const sessions = await prisma.deviceSession.findMany({ where: { userId } }).catch(()=>[]);
  const appeals = await prisma.appeal.findMany({ where: { userId } }).catch(()=>[]);

  await safeJSON(path.join(dir, 'profile.json'), profile);
  await safeJSON(path.join(dir, 'posts.json'), posts);
  await safeJSON(path.join(dir, 'comments.json'), comments);
  await safeJSON(path.join(dir, 'votes.json'), votes);
  await safeJSON(path.join(dir, 'sessions.json'), sessions);
  await safeJSON(path.join(dir, 'appeals.json'), appeals);

  // Zip the folder
  const { default: archiver } = await import('archiver');
  const zipPath = path.join(OUTDIR, `${userId}_${ts}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dir, false);
    archive.finalize();
  });

  await prisma.dSRRequest.update({ where: { id: r.id }, data: { status: 'COMPLETE', completedAt: new Date(), exportPath: zipPath } });
  return zipPath;
}

export async function handleErasureById(requestId: string) {
  const r = await prisma.dSRRequest.findUnique({ where: { id: requestId } }) as any;
  if (!r) return;
  await prisma.dSRRequest.update({ where: { id: r.id }, data: { status: 'PROCESSING' } });
  const userId = r.userId;

  // Redact personally-identifiable info but keep thread integrity
  await prisma.vote.deleteMany({ where: { userId } }).catch(()=>{});
  await prisma.webAuthnCredential.deleteMany({ where: { userId } }).catch(()=>{});
  await prisma.deviceSession.deleteMany({ where: { userId } }).catch(()=>{});
  await prisma.userSecurity.deleteMany({ where: { userId } }).catch(()=>{});

  // Replace post/comment bodies with "[deleted]" but keep counts
  await prisma.comment.updateMany({ where: { authorId: userId }, data: { body: '[deleted]' } }).catch(()=>{});
  await prisma.post.updateMany({ where: { authorId: userId }, data: { body: '[deleted]', title: '[deleted]' } }).catch(()=>{});

  // Anonymize the user record
  const anonName = `deleted_user_${userId.slice(0,8)}`;
  await prisma.user.update({ where: { id: userId }, data: {
    username: anonName,
    email: null as any,
    password: '',
    displayName: anonName,
    bio: null as any,
  } as any }).catch(()=>{});

  await prisma.dSRRequest.update({ where: { id: r.id }, data: { status: 'COMPLETE', completedAt: new Date() } });
  return true;
}
