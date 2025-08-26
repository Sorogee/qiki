'use client';
import React, { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function token(){ if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

export default function SavedSearches() {
  const [list,setList]=useState<any[]>([]);
  const [name,setName]=useState('');
  const [query,setQuery]=useState('');
  const [filters,setFilters]=useState('');

  async function load(){
    const r = await fetch(`${API}/api/saved-searches`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (r.ok) setList(await r.json());
  }
  useEffect(()=>{ load(); }, []);

  async function add(){
    const f = filters ? JSON.parse(filters) : undefined;
    const r = await fetch(`${API}/api/saved-searches`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` }, body: JSON.stringify({ name, query, filters: f }) });
    if (r.ok) { setName(''); setQuery(''); setFilters(''); load(); }
  }
  async function del(id:string){
    await fetch(`${API}/api/saved-searches/${id}`, { method:'DELETE', headers: { 'Authorization': `Bearer ${token()}` } });
    load();
  }

  return (
    <main style={{padding:16, maxWidth:720}}>
      <h1>Saved Searches</h1>
      <div className="card" style={{padding:12, marginBottom:16}}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Query" value={query} onChange={e=>setQuery(e.target.value)} />
        <textarea placeholder='Filters as JSON, e.g. {"time":"week","nsfw":"exclude"}' value={filters} onChange={e=>setFilters(e.target.value)} />
        <button onClick={add}>Save</button>
      </div>
      <ul>
        {list.map(it=>(
          <li key={it.id} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #333', padding:'6px 0'}}>
            <span><b>{it.name}</b> — <code>{it.query}</code></span>
            <button onClick={()=>del(it.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
