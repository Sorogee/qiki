'use client';
import React, { useEffect, useState } from 'react';
import { useT } from '../../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function token() { if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

async function authed(path:string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    (init||{}),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token()}`,
      (init?.headers||{})
    }
  });
}

export default function SecuritySettings() {
  const { t } = useT();
  const [status, setStatus] = useState<any>(null);

  async function refresh() {
    const r = await authed('/api/sessions');
    setStatus(await r.json());
  }
  useEffect(()=>{ refresh(); },[]);

  async function revoke(id: string) {
    await authed('/api/sessions/revoke', { method:'POST', body: JSON.stringify({ id }) });
    refresh();
  }
  async function revokeAll() {
    await authed('/api/sessions/revoke_all', { method:'POST' });
    refresh();
  }

  return (
    <main className="p-6 space-y-6" aria-labelledby="securityHeading">
      <h1 className="text-2xl font-semibold" id="securityHeading">{t('Security')}</h1>
      <section className="space-y-2">
        <h3 className="text-lg font-medium">{t('Active Sessions')}</h3>
        <button className="btn" onClick={revokeAll} aria-label="sign out everywhere">{t('Sign out everywhere')}</button>
        <ul className="divide-y divide-gray-700 mt-2" role="list">
          {(status||[]).map((s:any)=>(
            <li key={s.id} className="flex justify-between py-2" role="listitem">
              <span>{new Date(s.createdAt).toLocaleString()} — {s.ip || 'ip?'} — {(s.ua||'').slice(0,80)}</span>
              {!s.revokedAt ? <button className="btn" onClick={()=>revoke(s.id)} aria-label={`revoke session ${s.id}`}>Revoke</button> : <i>revoked</i>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
