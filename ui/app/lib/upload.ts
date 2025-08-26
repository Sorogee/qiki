'use client';
import { withCsrfHeaders } from '@/app/lib/csrf';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function uploadFile(file: File, token: string) {
  const signRes = await fetch(`${API}/api/media/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, contentLength: file.size })
  });
  if (!signRes.ok) throw new Error('Failed to sign upload');
  const { uploadId, putUrl, key } = await signRes.json();

  const put = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error('Upload PUT failed');

  const fin = await fetch(`${API}/api/media/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ uploadId, key })
  });
  if (!fin.ok) throw new Error('Finalize failed');

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await fetch(`${API}/api/media/status/${uploadId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await s.json();
    if (data.status === 'APPROVED') return { url: data.url, key: data.key };
    if (data.status === 'REJECTED') throw new Error(data.error || 'Rejected');
  }
  throw new Error('Scan timeout');
}

export default uploadFile;
