'use client';
import React, { useState } from 'react';
import { withCsrfHeaders } from '@/app/lib/csrf';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export default function Login() {
  const [usernameOrEmail, setU] = useState('');
  const [password, setP] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [challengeId, setCh] = useState<string | null>(null);
  const [totp, setTotp] = useState('');

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    
    const res = await fetch(`${API}/auth2/login`,
  await withCsrfHeaders({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password })
  })
);
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || 'Login failed');
    if (data.token) {
      localStorage.setItem('token', data.token);
      setMsg('Logged in!');
      return;
    }
    if (data.requires2fa) {
      setCh(data.challengeId);
      setMsg('Enter your 2FA code or use a passkey.');
    }
  }

  async function completeTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    const res = await fetch(`${API}/auth2/login/complete`, await withCsrfHeaders({ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ challengeId, method:'totp', totp })) });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || '2FA failed');
    localStorage.setItem('token', data.token);
    setMsg('Logged in!');
  }

  async function completePasskey() {
    if (!challengeId) return;
    // get options
    const o = await fetch(`${API}/api/security/webauthn/auth/options`, await withCsrfHeaders({ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ usernameOrEmail })) });
    const j = await o.json();
    // @ts-ignore
    const cred: PublicKeyCredential = await navigator.credentials.get({ publicKey: j.options as PublicKeyCredentialRequestOptions }) as any;
    const assertion = {
      id: cred.id,
      rawId: btoa(String.fromCharCode(new Uint8Array(cred.rawId as ArrayBuffer))),
      type: cred.type,
      response: {
        clientDataJSON: btoa(String.fromCharCode(new Uint8Array((cred.response as any).clientDataJSON))),
        authenticatorData: btoa(String.fromCharCode(new Uint8Array((cred.response as any).authenticatorData))),
        signature: btoa(String.fromCharCode(new Uint8Array((cred.response as any).signature))),
        userHandle: (cred.response as any).userHandle ? btoa(String.fromCharCode(new Uint8Array((cred.response as any).userHandle))) : null
      }
    };
    const res = await fetch(`${API}/auth2/login/complete`, await withCsrfHeaders({ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ challengeId, method:'webauthn', response: assertion })) });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error || 'Passkey failed');
    localStorage.setItem('token', data.token);
    setMsg('Logged in!');
  }

  return (
    <main style={{padding:16, maxWidth:420}}>
      <h1>Login</h1>
      {!challengeId && <form onSubmit={doLogin} className="card form">
        <label>Username or Email
          <input value={usernameOrEmail} onChange={e=>setU(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={e=>setP(e.target.value)} required />
        </label>
        <button type="submit">Continue</button>
      </form>}
      {challengeId && <form onSubmit={completeTotp} className="card form" style={{marginTop:16}}>
        <p>{msg || '2FA required'}</p>
        <label>TOTP Code
          <input placeholder="123456" value={totp} onChange={e=>setTotp(e.target.value)} />
        </label>
        <div style={{display:'flex', gap:8}}>
          <button type="submit">Verify TOTP</button>
          <button type="button" onClick={completePasskey}>Use Passkey</button>
        </div>
      </form>}
      {msg && <p style={{marginTop:8}}>{msg}</p>}
    </main>
  );
}
