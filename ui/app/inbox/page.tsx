'use client';
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type N = { id:string; type:string; data:any; readAt?:string; createdAt:string };

export default function Inbox() {
  const [items, setItems] = useState<N[]>([]);
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  async function load() {
    const res = await fetch(`${API}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const { items } = await res.json();
      setItems(items);
    }
  }
  async function markAllRead() {
    await fetch(`${API}/api/notifications/read`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ all: true }) });
    load();
  }
  useEffect(()=>{ load(); },[]);

  return (
    <main style={{padding:16}}>
      <h1>Inbox</h1>
      <button onClick={markAllRead}>Mark all read</button>
      <ul>
        {items.map(n => (
          <li key={n.id} style={{padding:8, borderBottom:'1px solid #333', background:n.readAt ? 'transparent' : '#111'}}>
            <div style={{fontSize:12,opacity:.7}}>{new Date(n.createdAt).toLocaleString()}</div>
            {n.type === 'comment' ? (<div>💬 New comment by <b>@{n.data?.by}</b> on your post</div>) : (<div>{n.type}</div>)}
          </li>
        ))}
      </ul>
    </main>
  );
}
