'use client';
import React, { useEffect, useState } from 'react';
import { useT } from '../../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function token() { if (typeof window==='undefined') return ''; return localStorage.getItem('token')||''; }

export default function NotificationPrefs() {
  const { t } = useT();
  const [prefs, setPrefs] = useState<any>({ emailDigests: 'DAILY', realtime: true });
  const [msg, setMsg] = useState<string>('');

  async function load() {
    const r = await fetch(`${API}/api/notifications/prefs`, { headers: { 'authorization': `Bearer ${token()}` } });
    setPrefs(await r.json());
  }
  useEffect(()=>{ load(); },[]);

  async function save(e:any) {
    e.preventDefault();
    const r = await fetch(`${API}/api/notifications/prefs`, { method:'POST', headers: { 'authorization': `Bearer ${token()}`, 'content-type': 'application/json' }, body: JSON.stringify(prefs) });
    if (r.ok) setMsg('Saved'); else setMsg('Failed');
  }

  return (
    <main className="p-6 space-y-4" aria-labelledby="notifHeading">
      <h1 id="notifHeading" className="text-2xl font-semibold">Notification Preferences</h1>
      {msg && <div aria-live="polite" className="text-sm opacity-75">{msg}</div>}
      <form onSubmit={save} className="space-y-3 max-w-xl">
        <label className="block">Email digests
          <select className="border p-2 block" value={prefs.emailDigests} onChange={e=>setPrefs({ prefs, emailDigests: e.target.value })} aria-label="email digests frequency">
            <option value="OFF">Off</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </label>
        <label className="block">
          <input type="checkbox" checked={!!prefs.realtime} onChange={e=>setPrefs({ prefs, realtime: e.target.checked })} /> Realtime (Web/WS) notifications
        </label>
        <button className="btn" type="submit" aria-label="save notification preferences">Save</button>
      </form>
    </main>
  );
}
