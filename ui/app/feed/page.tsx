'use client';
import React, { useEffect, useMemo, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Item = { id:string, title:string, createdAt:string, community?: { slug:string }, nsfw?: boolean, ups?:number, downs?:number, score?:number };

export default function FeedPage() {
  const [sort,setSort]=useState<'hot'|'new'|'top'>('hot');
  const [time,setTime]=useState<'24h'|'week'|'month'|'year'|'all'>('all');
  const [nsfw,setNsfw]=useState<'exclude'|'include'|'only'>('exclude');
  const [community,setCommunity]=useState('');
  const [items,setItems]=useState<Item[]>([]);
  const [loading,setLoading]=useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ sort, time, nsfw });
    if (community) params.set('community', community);
    const r = await fetch(`${API}/api/feed?`+params.toString());
    const j = await r.json();
    setItems(j.items||[]);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, [sort,time,nsfw,community]);

  return (
    <main style={{padding:16}}>
      <h1>Feed</h1>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
        <select value={sort} onChange={e=>setSort(e.target.value as any)}>
          <option value="hot">Hot</option>
          <option value="new">New</option>
          <option value="top">Top</option>
        </select>
        <select value={time} onChange={e=>setTime(e.target.value as any)}>
          <option value="all">All time</option>
          <option value="24h">24 hours</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
        <select value={nsfw} onChange={e=>setNsfw(e.target.value as any)}>
          <option value="exclude">SFW only</option>
          <option value="include">Include NSFW</option>
          <option value="only">NSFW only</option>
        </select>
        <input placeholder="community slug (optional)" value={community} onChange={e=>setCommunity(e.target.value)} />
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>

      <ul>
        {items.map(p=>(
          <li key={p.id} style={{padding:'8px 0', borderBottom:'1px solid #333'}}>
            <div style={{display:'flex', gap:6}}>
              <b>{p.title}</b>
              <span>·</span>
              <span>{new Date(p.createdAt).toLocaleString()}</span>
              {p.community?.slug && <><span>·</span><span>c/{p.community.slug}</span></>}
              {typeof p.score === 'number' && <><span>·</span><span>score {p.score.toFixed(4)}</span></>}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
