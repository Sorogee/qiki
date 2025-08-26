'use client';
import React, { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Target = { type:'POST'|'COMMENT'|'USER', id:string };

export default function ModConsole() {
  const [queue,setQueue]=useState<any[]>([]);
  const [sel,setSel]=useState<Record<string,Target>>({});
  const [msg,setMsg]=useState<string>('');

  async function load() {
    // Use existing modqueue endpoint if available; otherwise fetch recent queued/removed posts
    const r = await fetch(`${API}/api/modqueue?limit=100`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` } });
    if (r.ok) { setQueue(await r.json()); }
  }
  useEffect(()=>{ load(); }, []);

  function toggle(t:Target){ setSel(s=>{ const k=`${t.type}:${t.id}`; const n={s}; if(n[k]) delete n[k]; else n[k]=t; return n; }); }

  async function act(action:string){
    const targets = Object.values(sel);
    if (!targets.length) { setMsg('Select at least one item'); return; }
    const r = await fetch(`${API}/api/mod/bulk`, { method:'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')||''}`}, body: JSON.stringify({ action, targets }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error||'failed'); return; }
    setMsg(`Done: ${j.results.filter((x:any)=>x.ok).length} ok, ${j.results.filter((x:any)=>!x.ok).length} failed`);
    setSel({}); load();
  }

  return (
    <main style={{padding:16}}>
      <h1>Moderation Console</h1>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        {['APPROVE','REMOVE','LOCK','UNLOCK','ESCALATE'].map(a=>(
          <button key={a} onClick={()=>act(a)}>{a}</button>
        ))}
      </div>
      <p>{msg}</p>
      <ul style={{marginTop:12}}>
        {queue.map((p:any)=>(
          <li key={p.id} onClick={()=>toggle({type:'POST', id:p.id})} style={{cursor:'pointer', padding:'6px 0', borderBottom:'1px solid #333'}}>
            <input type="checkbox" readOnly checked={!!sel[`POST:${p.id}`]} /> [{p.status}] {p.title} — {p.community?.slug}
          </li>
        ))}
      </ul>
    </main>
  );
}
