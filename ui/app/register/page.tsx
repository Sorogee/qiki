'use client';
'use client';
import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function withCsrfHeaders(init: RequestInit = {}): Promise<RequestInit> {
  // If your project has a real implementation, you can replace this stub.
  return init;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = API;
    try {
      const r = await fetch(`${base}/auth/register`, await withCsrfHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }));
      setMsg(r.ok ? 'Registered' : 'Register failed');
    } catch (err) {
      setMsg('Network error');
    }
  }

  return (
    <form onSubmit={submit} className="card form">
      <h1>Register</h1>
      {msg && <div className="muted">{msg}</div>}
      <label>
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </label>
      <button type="submit">Register</button>
    </form>
  );
}
