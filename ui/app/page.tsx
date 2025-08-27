"use client";
// Sort controls
function SortBar() {
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const current = url ? (url.searchParams.get('sort') || 'hot') : 'hot';
  const set = (s:string) => { if (!url) return; url.searchParams.set('sort', s); window.location.href = url.toString(); };
  return (<div style={{display:'flex',gap:8,margin:'8px 0'}}>
    <button onClick={()=>set('hot')} disabled={current==='hot'}>Hot</button>
    <button onClick={()=>set('new')} disabled={current==='new'}>New</button>
    <button onClick={()=>set('top')} disabled={current==='top'}>Top</button>
  </div>);
}
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { fetch(`${API}/api/feed`).then(r => r.json()).then(setPosts).catch(()=>{}); }, []);

  return (
    <div>
      <h1>Home Feed</h1>
      <ul className="list">
        {posts.map(p => (
          <li key={p.id} className="card">
            <div className="muted">{p.community.name} / {new Date(p.createdAt).toLocaleString()}</div>
            <h3>{p.title}</h3>
            {p.body && <p>{p.body}</p>}
            {p.url && <a href={p.url} target="_blank" rel="noreferrer">{p.url}</a>}
            <div className="muted">by <a href={`/u/${p.author.username}`}>{p.author.username}</a> • score {p.score}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}