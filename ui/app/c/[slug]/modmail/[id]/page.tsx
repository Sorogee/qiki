'use client';
import { useEffect, useState } from 'react';
import { useT } from '../../../../../lib/i18n';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function token() { if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

export default function ModmailThread({ params }: any) {
  const { t } = useT();
  const { slug, id } = params;
  const [thread, setThread] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [body, setBody] = useState('');

  async function load() {
    const r = await fetch(`${API}/api/communities/${slug}/modmail/${id}`, { headers: { 'authorization': `Bearer ${token()}` } });
    const j = await r.json(); setThread(j.thread); setMsgs(j.messages||[]);
  }
  useEffect(()=>{ load(); }, [slug, id]);

  async function reply(e:any) {
    e.preventDefault();
    const r = await fetch(`${API}/api/communities/${slug}/modmail/${id}`, { method:'POST', headers: { 'content-type':'application/json','authorization':`Bearer ${token()}` }, body: JSON.stringify({ body }) });
    if (r.ok) { setBody(''); load(); }
  }
  async function close() {
    const r = await fetch(`${API}/api/communities/${slug}/modmail/${id}/close`, { method:'POST', headers: { 'authorization': `Bearer ${token()}` } });
    if (r.ok) load();
  }

  if (!thread) return <main className="p-6">{t('Loading')}</main>;
  return (
    <main className="p-6 space-y-4" aria-labelledby="threadHeading">
      <h1 className="text-2xl font-semibold" id="threadHeading">{thread.subject}</h1>
      <div className="text-sm opacity-75">Status: {thread.status}</div>
      <button className="btn" onClick={close} aria-label="close thread">{t('Close')}</button>
      <ul className="space-y-2" role="list">
        {msgs.map((m:any)=>(
          <li key={m.id} className="border p-2 rounded" role="listitem">
            <div className="text-sm opacity-75">{new Date(m.createdAt).toLocaleString()}</div>
            <div>{m.body}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={reply} className="space-y-2 border p-3 rounded" aria-label="reply">
        <label htmlFor="replyBody" className="sr-only">Reply</label>
        <textarea id="replyBody" className="border p-2 w-full" rows={4} placeholder="Reply" value={body} onChange={e=>setBody(e.target.value)} />
        <button className="btn" type="submit" aria-label="reply">{t('Reply')}</button>
      </form>
    </main>
  );
}
