'use client';
'use client';
import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function withCsrfHeaders(init: RequestInit = {}): Promise<RequestInit> {
  return init;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [totp, setTotp] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/auth2/login/start`, await withCsrfHeaders({
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      }));
      const data = await res.json();
      if (!res.ok) return setMsg(data.error || 'Login failed');
      setChallengeId(data.challengeId);
    } catch { setMsg('Network error'); }
  }

  async function completeTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    const res = await fetch(`${API}/auth2/login/complete`, await withCsrfHeaders({
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ challengeId, method:'totp', totp })
    }));
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || '2FA failed');
    if (typeof window !== 'undefined') localStorage.setItem('token', data.token);
    setMsg('Logged in!');
  }

  return (
    <div className="card form">
      <h1>Login</h1>
      {msg && <div className="muted">{msg}</div>}

      {!challengeId ? (
        <form onSubmit={start}>
          <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
          <button type="submit">Login</button>
        </form>
      ) : (
        <form onSubmit={completeTotp}>
          <label>Authenticator code<input value={totp} onChange={e=>setTotp(e.target.value)} required /></label>
          <button type="submit">Verify</button>
        </form>
      )}
    </div>
  );
}
