'use client';
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Log = { id:string; actorId?:string; action:string; targetType:string; targetId?:string; ip?:string; userAgent?:string; createdAt:string };

export default function Audit() {
  const [rows, setRows] = useState<Log[]>([]);
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/admin/audit`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setRows(await res.json());
    })();
  }, []);

  return (
    <main style={{padding:16}}>
      <h1>Audit Logs</h1>
      <a href={`${API}/api/admin/export/audit.ndjson`} target="_blank" rel="noreferrer">Export NDJSON</a>
      <table style={{width:'100%', marginTop:12}}>
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th><th>UA</th></tr></thead>
        <tbody>
          {rows.map(l => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.actorId || '-'}</td>
              <td>{l.action}</td>
              <td>{l.targetType}:{l.targetId || ''}</td>
              <td>{l.ip || ''}</td>
              <td style={{maxWidth:300, overflow:'hidden', textOverflow:'ellipsis'}}>{l.userAgent || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
