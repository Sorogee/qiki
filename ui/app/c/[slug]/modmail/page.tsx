'use client';
import { useEffect, useState } from 'react';
import { useT } from '../../../../lib/i18n';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function token() { if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

export default function ModmailList({ params }: any) {
  const { t } = useT();
  const { slug } = params;
  const [rows, setRows] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  async function load() { const r = await fetch(`${API}/api/communities/${slug}/modmail`, { headers: { 'authorization': `Bearer ${token()}` } }); setRows(await r.json()); }
  useEffect(()=>{ load(); }, [slug]);

  async function create(e:any) {
    e.preventDefault();
    const r = await fetch(`${API}/api/communities/${slug}/modmail`, { method:'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token()}` }, body: JSON.stringify({ subject, body }) });
    if (r.ok) { setSubject(''); setBody(''); load(); }
  }

  return (
    <main className="p-6 space-y-4" aria-labelledby="modmailHeading">
      <h1 className="text-2xl font-semibold" id="modmailHeading">{t('Modmail')}</h1>
      <form onSubmit={create} className="space-y-2 border p-3 rounded" aria-label="create modmail thread">
        <label htmlFor="subject" className="sr-only">Subject</label>
        <input id="subject" className="border p-2 w-full" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
        <label htmlFor="body" className="sr-only">Body</label>
        <textarea id="body" className="border p-2 w-full" rows={5} placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
        <button className="btn" type="submit" aria-label="create thread">{t('Create thread')}</button>
      </form>
      <ul className="space-y-2" role="list">
        {rows.map((t:any)=>(
          <li key={t.id} className="border rounded p-2" role="listitem">
            <a href={`/c/${slug}/modmail/${t.id}`} className="font-medium">{t.subject}</a>
            <div className="text-sm opacity-75">{t.status} • {new Date(t.updatedAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
