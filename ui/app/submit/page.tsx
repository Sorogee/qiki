'use client';
'use client';
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SubmitPage() {
  const [communitySlug, setCommunitySlug] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [cap, setCap] = useState<any | null>(null);

  useEffect(() => {
    // fetch captcha on mount if needed
    (async () => {
      try {
        const r = await fetch(`${API}/api/captcha`);
        if (r.ok) setCap(await r.json());
      } catch { /* ignore */ }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
    try {
      const res = await fetch(`${API}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${token}`,
          ...(cap ? { 'x-captcha-id': cap.id, 'x-captcha-answer': eval(String(cap.prompt).replace('= ?', '')) } : {})
        },
        body: JSON.stringify({ communitySlug, title, body })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data.error || 'Failed'); else setMsg('Posted!');
    } catch { setMsg('Network error'); }
  }

  return (
    <form onSubmit={submit} className="card form">
      <h1>Submit</h1>
      {msg && <div className="muted">{msg}</div>}
      <label>Community Slug<input value={communitySlug} onChange={e=>setCommunitySlug(e.target.value)} required/></label>
      <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} required/></label>
      <label>Body<textarea value={body} onChange={e=>setBody(e.target.value)} /></label>
      <button type="submit">Post</button>
    </form>
  );
}
