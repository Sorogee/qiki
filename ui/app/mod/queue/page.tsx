'use client';
'use client';
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type QueueItem = any;

export default function ModQueuePage() {
  const [list, setList] = useState<QueueItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  function getToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  }

  async function load() {
    try {
      const res = await fetch(`${API}/api/modqueue`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) { setMsg('Forbidden or error'); return; }
      setList(await res.json());
    } catch (e) {
      setMsg('Network error');
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await fetch(`${API}/api/modqueue/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function removeItem(id: string) {
    await fetch(`${API}/api/modqueue/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <h1>Moderation Queue</h1>
      {msg && <div className="muted">{msg}</div>}
      <ul className="list">
        {list.map((item: any) => (
          <li key={item.id} className="card">
            <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
            <div><b>{item.title || item.reason}</b></div>
            <div style={{display:'flex', gap: 8, marginTop: 8}}>
              <button onClick={() => approve(item.id)}>Approve</button>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
