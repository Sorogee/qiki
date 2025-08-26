'use client';
import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n';
import { withCsrfHeaders } from '@/app/lib/csrf';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Submit() {
  const { t } = useT();
  const [communities, setCommunities] = useState<any[]>([]);
  const [communitySlug, setCommunity] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(()=>{ fetch(`${API}/api/communities`).then(r=>r.json()).then(setCommunities); },[]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const token = localStorage.getItem('token') || '';
    const cap = await fetch(`${API}/api/captcha/new`).then(r=>r.json());
    const res = await fetch(`${API}/api/posts`, await withCsrfHeaders({
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}`, 'x-captcha-id': cap.id, 'x-captcha-answer': eval(cap.prompt.replace('= ?','')) },
      body: JSON.stringify({ communitySlug, title, body }))
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error||'Failed'); else setMsg('Posted!');
  }

  return (
    <form onSubmit={submit} className="p-6 space-y-3" aria-labelledby="newPostHeading">
      <h1 className="text-2xl font-semibold" id="newPostHeading">{t('New Post')}</h1>
      {msg && <div className="text-sm opacity-80" aria-live="polite">{msg}</div>}
      <label className="block" htmlFor="communitySel">{t('Community')}
        <select id="communitySel" value={communitySlug} onChange={e=>setCommunity(e.target.value)} className="block border p-2" aria-required="true">
          <option value="">Select community</option>
          {communities.map((c:any)=>(<option key={c.slug} value={c.slug}>{c.name}</option>))}
        </select>
      </label>
      <label className="block" htmlFor="titleInput">{t('Title')}
        <input id="titleInput" value={title} onChange={e=>setTitle(e.target.value)} className="block border p-2 w-full" placeholder={t('Title')}/>
      </label>
      <label className="block" htmlFor="bodyInput">{t('Body')}
        <textarea id="bodyInput" value={body} onChange={e=>setBody(e.target.value)} className="block border p-2 w-full" rows={6} placeholder={t('Body')}/>
      </label>
      <button className="btn" type="submit" aria-label="submit post">{t('Post')}</button>
    </form>
  );
}