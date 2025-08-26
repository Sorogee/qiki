'use client';
import React, { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Appeals() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<string>('');

  async function load() {
    const r = await fetch(`${API}/api/mod/appeals`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` } });
    if (r.ok) setRows(await r.json());
  }
  useEffect(()=>{ load(); }, []);

  async function resolve(id:string, decision:'ACCEPTED'|'REJECTED'){
    const r = await fetch(`${API}/api/mod/appeals/${id}/resolve`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')||''}` }, body: JSON.stringify({ decision }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error||'failed'); else { setMsg('ok'); load(); }
  }

  return (
    <main style={{padding:16}}>
      <h1>Appeals</h1>
      <p>{msg}</p>
      <ul>
        {rows.map((a:any)=>(
          <li key={a.id} style={{borderBottom:'1px solid #333', padding:'8px 0'}}>
            <div><b>{a.status}</b> — {a.reason}</div>
            <div>Case: {a.case?.id} — Subject: {a.case?.subjectType}:{a.case?.subjectId}</div>
            <button onClick={()=>resolve(a.id,'ACCEPTED')}>Accept</button>
            <button onClick={()=>resolve(a.id,'REJECTED')}>Reject</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
