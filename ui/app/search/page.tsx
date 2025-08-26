'use client';
import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SearchPage() {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>({ posts: [] });
  const [trending, setTrending] = useState<any>({ queries: [], communities: [] });
  const [saved, setSaved] = useState<any[]>([]);
  const [statusMsg, setStatus] = useState<string>('');

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  async function runSearch(qq?: string) {
    const query = typeof qq === 'string' ? qq : q;
    setStatus(t('Search') + '');
    const r = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    const j = await r.json();
    setResults(j);
    setStatus('');
  }

  async function loadSaved() {
    if (!token) return setSaved([]);
    const r = await fetch(`${API}/api/saved-searches`, { headers: { 'authorization': `Bearer ${token}` } });
    setSaved(await r.json());
  }

  async function saveCurrent() {
    if (!token) { alert('Login to save searches'); return; }
    const name = prompt('Name this search', q || 'Untitled');
    if (!name) return;
    const r = await fetch(`${API}/api/saved-searches`, { method:'POST', headers: { 'content-type':'application/json', 'authorization': `Bearer ${token}` }, body: JSON.stringify({ name, query: q }) });
    if (r.ok) loadSaved();
  }

  useEffect(() => { fetch(`${API}/api/search/trending`).then(r=>r.json()).then(setTrending); loadSaved(); }, [token]);

  return (
    <main className="p-6 space-y-4" aria-labelledby="searchHeading">
      <h1 id="searchHeading" className="text-2xl font-semibold">{t('Search')}</h1>
      <div className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">{t('Search')}</label>
        <input id="q" className="border p-2 w-full" placeholder={t('Search')} value={q} aria-label="search input" onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') runSearch(); }} />
        <button className="btn" onClick={()=>runSearch()} aria-label="run search">{t('Search')}</button>
        <button className="btn" onClick={saveCurrent} aria-label="save search">{t('Save')}</button>
      </div>

      <div aria-live="polite" aria-atomic="true" className="text-sm opacity-75">{statusMsg}</div>

      <section aria-labelledby="trendHeading">
        <h3 id="trendHeading" className="font-medium mt-4 mb-2">{t('Trending')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="opacity-75 text-sm mb-1">{t('Queries')}</div>
            <ul className="list-disc pl-5">
              {trending.queries?.map((s:string)=>(<li key={s}><a href={`?q=${encodeURIComponent(s)}`} onClick={(e)=>{e.preventDefault(); setQ(s); runSearch(s);}}>{s}</a></li>))}
            </ul>
          </div>
          <div>
            <div className="opacity-75 text-sm mb-1">{t('Communities')}</div>
            <ul className="list-disc pl-5">
              {trending.communities?.map((s:string)=>(<li key={s}><a href={`/c/${s}`}>{s}</a></li>))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="resultsHeading">
        <h3 id="resultsHeading" className="font-medium mt-4 mb-2">Results</h3>
        <ul className="space-y-2">
          {results.posts?.map((p:any)=>(
            <li key={p.id} className="border rounded p-3" role="article" aria-labelledby={`post-${p.id}-title`}>
              <div className="text-sm opacity-70">{p.communityName} • {new Date(p.createdAt).toLocaleString()}</div>
              <div id={`post-${p.id}-title`} className="font-medium">{p.title}</div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="savedHeading">
        <h3 id="savedHeading" className="font-medium mt-6 mb-2">{t('Saved searches')}</h3>
        <ul className="space-y-2">
          {saved.map((s:any)=>(
            <li key={s.id} className="border rounded p-2 flex justify-between" role="listitem">
              <span>{s.name}</span>
              <button className="btn" onClick={()=>{ setQ(s.query); runSearch(s.query); }} aria-label={`Run saved search ${s.name}`}>Run</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
