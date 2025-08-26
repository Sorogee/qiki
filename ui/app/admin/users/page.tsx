'use client';
import React, { useEffect, useState } from 'react';
import { withCsrfHeaders } from '@/app/lib/csrf';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type UserRow = { id:string; username:string; email:string; role:'USER'|'ADMIN'; banned:boolean; emailVerified:boolean; createdAt:string };

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q,setQ] = useState('');
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  async function load() {
    const res = await fetch(`${API}/api/admin/users?q=${encodeURIComponent(q)}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setRows(await res.json());
  }
  useEffect(()=>{ load(); },[]);

  async function setRole(id:string, role:'USER'|'ADMIN') {
    await fetch(`${API}/api/admin/users/${id}/role`, await withCsrfHeaders({ method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ role }) }));
    load();
  }
  async function ban(id:string, banned:boolean) {
    await fetch(`${API}/api/admin/users/${id}/ban`, await withCsrfHeaders({ method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ banned }) }));
    load();
  }

  return (
    <main style={{padding:16}}>
      <h1>Users</h1>
      <input placeholder="Search username/email" value={q} onChange={e=>setQ(e.target.value)} />
      <button onClick={load}>Search</button>
      <table style={{width:'100%', marginTop:12}}>
        <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Banned</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{String(u.banned)}</td>
              <td>
                {u.role === 'ADMIN' ? <button onClick={()=>setRole(u.id,'USER')}>Demote</button> : <button onClick={()=>setRole(u.id,'ADMIN')}>Promote</button>}
                {u.banned ? <button onClick={()=>ban(u.id,false)}>Unban</button> : <button onClick={()=>ban(u.id,true)}>Ban</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
