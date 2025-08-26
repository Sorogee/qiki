interface Params { params: { slug: string } }
async function getCommunity(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  try { const r = await fetch(`${base}/api/c/${slug}`, { cache: 'no-store' }); if (!r.ok) return null; return r.json(); }
  catch { return null; }
}
export default async function CommunityPage({ params }: Params) {
  const data = await getCommunity(params.slug);
  return (<section><h2>c/{params.slug}</h2><pre>{JSON.stringify(data || {note:'stub'}, null, 2)}</pre></section>);
}
