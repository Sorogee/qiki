'use client';
import { useEffect, useState } from 'react';
import { useT } from '../../../../../lib/i18n';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function token() { if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

export default function FlairsPage({ params }: any) {
  const { t } = useT();
  const { slug } = params;
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', textColor: '#000000', bgColor: '#eeeeee', isUserFlair: false, modOnly: false });

  async function load() {
    const r = await fetch(`${API}/api/communities/${slug}/flairs`);
    setRows(await r.json());
  }
  useEffect(()=>{ load(); }, [slug]);

  async function create(e:any) {
    e.preventDefault();
    const r = await fetch(`${API}/api/communities/${slug}/flairs`, { method:'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token()}` }, body: JSON.stringify(form) });
    if (r.ok) { setForm({ name:'', textColor:'#000000', bgColor:'#eeeeee', isUserFlair:false, modOnly:false }); load(); }
  }
  async function del(id:string) {
    const r = await fetch(`${API}/api/communities/${slug}/flairs/${id}/delete`, { method:'POST', headers: { 'authorization': `Bearer ${token()}` } });
    if (r.ok) load();
  }

  return (
    <main className="p-6 space-y-4" aria-labelledby="flairsHeading">
      <h1 className="text-2xl font-semibold" id="flairsHeading">{t('Flairs')}</h1>

      <form onSubmit={create} className="space-y-2 border p-3 rounded" aria-label="create flair">
        <div className="flex gap-2 items-center">
          <label className="sr-only" htmlFor="flairName">{t('Flairs')}</label>
          <input id="flairName" className="border p-2" placeholder="Name" value={form.name} onChange={e=>setForm({form, name:e.target.value})}/>
          <label htmlFor="txtColor">Text</label>
          <input id="txtColor" className="border p-2 w-28" aria-label="text color" type="color" value={form.textColor} onChange={e=>setForm({form, textColor:e.target.value})}/>
          <label htmlFor="bgColor">BG</label>
          <input id="bgColor" className="border p-2 w-28" aria-label="background color" type="color" value={form.bgColor} onChange={e=>setForm({form, bgColor:e.target.value})}/>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.isUserFlair} onChange={e=>setForm({form, isUserFlair:e.target.checked})}/>{t('User flair')}</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.modOnly} onChange={e=>setForm({form, modOnly:e.target.checked})}/>{t('Mod-only')}</label>
          <button className="btn" type="submit" aria-label="create flair">{t('Create')}</button>
        </div>
      </form>

      <ul className="space-y-2" role="list">
        {rows.map((f:any)=>(
          <li key={f.id} className="border p-2 rounded flex justify-between" role="listitem">
            <span style={{ background:f.bgColor, color:f.textColor }} className="px-2 py-1 rounded" aria-label={`flair ${f.name}`}>{f.name}</span>
            <button className="btn" onClick={()=>del(f.id)} aria-label={`delete flair ${f.name}`}>{t('Delete')}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
