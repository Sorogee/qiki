'use client';
import { useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export default function NewCommunity() {
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [about, setAbout] = useState(''); const [rules, setRules] = useState(''); const [nsfw, setN] = useState(false); const [msg, setMsg] = useState<string|null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`${API}/api/communities`, await withCsrfHeaders({ method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({ name, slug, about, rules, nsfw }) });
    const data = await res.json(); if (!res.ok) setMsg(data.error||'Failed'); else setMsg('Created community!');
  }
  return (<form onSubmit={submit} className="card form"><h1>New Community</h1>{msg&&<div className="muted">{msg}</div>}<label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Slug<input value={slug} onChange={e=>setSlug(e.target.value)} required/></label><label>About<textarea value={about} onChange={e=>setAbout(e.target.value)} /></label><label>Rules<textarea value={rules} onChange={e=>setRules(e.target.value)} /></label><label><input type="checkbox" checked={nsfw} onChange={e=>setN(e.target.checked)}/> NSFW</label><button type="submit">Create</button></form>);
}
