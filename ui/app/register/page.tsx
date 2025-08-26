'use client';
import { useState } from 'react';
import { withCsrfHeaders } from '@/app/lib/csrf';
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    try {
      const r = await fetch(`${base}/auth/register`, await withCsrfHeaders({ method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password })) });
      setMsg(r.ok ? 'Registered' : 'Register failed');
    } catch { setMsg('Network error'); }
  }
  return (<section><h2>Register</h2>
    <form onSubmit={onSubmit}>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Register</button>
    </form>{msg && <p>{msg}</p>}</section>);
}