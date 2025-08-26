'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminHome() {
  return (
    <main style={{padding:16}}>
      <h1>Admin</h1>
      <ul>
        <li><Link href="/admin/users">Manage Users</Link></li>
        <li><Link href="/admin/audit">Audit Logs</Link></li>
      </ul>
    </main>
  );
}
