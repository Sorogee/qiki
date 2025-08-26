'use client';
import { withCsrfHeaders } from '@/app/lib/csrf';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export default function Reports() {
  const [list, setList] = useState<any[]>([]); const [msg, setMsg] = useState<string|null>(null);
  async function load(){ const token=localStorage.getItem('token')||''; const res=await fetch(`${API}/api/mod/reports`,{headers:{'Authorization':`Bearer ${token}`}}); if(!res.ok) return setMsg('Forbidden or error'); setList(await res.json()); }
  useEffect(()=>{ load(); },[]);
  async function act(id:string, action:string){ const token=localStorage.getItem('token')||''; const res=await fetch(`${API}/api/mod/reports/action`, await withCsrfHeaders({method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({id,action}))}); if(res.ok) setList(list.filter(r=>r.id!==id)); }
  return (<div><h1>Reports</h1>{msg&&<div className="muted">{msg}</div>}<ul className="list">{list.map(r=>(<li key={r.id} className="card"><div className="muted">{new Date(r.createdAt).toLocaleString()} • by {r.reporter.username}</div><div><b>{r.reason}</b></div><div className="muted">status: {r.status}</div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={()=>act(r.id,'RESOLVE')}>Resolve</button><button onClick={()=>act(r.id,'REJECT')}>Reject</button>{r.targetPostId&&<button onClick={()=>act(r.id,'REMOVE_POST')}>Lock Post</button>}{r.targetCommentId&&<button onClick={()=>act(r.id,'REMOVE_COMMENT')}>Remove Comment</button>}</div></li>))}</ul></div>);
}
