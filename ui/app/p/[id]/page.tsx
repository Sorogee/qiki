interface Params { params: { id: string } }
async function getPost(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  try { const r = await fetch(`${base}/api/p/${id}`, { cache: 'no-store' }); if (!r.ok) return null; return r.json(); }
  catch { return null; }
}
export default async function PostPage({ params }: Params) {
  const data = await getPost(params.id);
  return (<section><h2>Post {params.id}</h2><pre>{JSON.stringify(data || {note:'stub'}, null, 2)}</pre></section>);
}
