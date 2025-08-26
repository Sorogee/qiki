'use client';
import React, { useEffect, useState } from 'react';
import { withCsrfHeaders } from '@/app/lib/csrf';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ModQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  async function load() {
    const res = await fetch(`${API}/api/modqueue`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setRows(await res.json());
  }
  useEffect(()=>{ load(); },[]);

  async function approve(id:string) {
    await fetch(`${API}/api/modqueue/approve`, await withCsrfHeaders({ method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id })) });
    load();
  }
  async function remove(id:string) {
    await fetch(`${API}/api/modqueue/remove`, await withCsrfHeaders({ method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id })) });
    load();
  }

  return (
    <main style={{padding:16}}>
      <h1>Moderation Queue</h1>
      <table style={{width:'100%', marginTop:12}}>
        <thead><tr><th>Community</th><th>Author</th><th>Title</th><th>Reason</th><th>Queued At</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td>{p.community?.slug}</td>
              <td>@{p.author?.username}</td>
              <td>{p.title}</td>
              <td>{p.modReason || '-'}</td>
              <td>{p.modQueuedAt ? new Date(p.modQueuedAt).toLocaleString() : '-'}</td>
              <td>
                <button onClick={()=>approve(p.id)}>Approve</button>
                <button onClick={()=>remove(p.id)} style={{marginLeft:8}}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}