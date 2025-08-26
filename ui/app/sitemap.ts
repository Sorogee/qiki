import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const [cR, pR] = await Promise.all([
      fetch(`${api}/api/communities`, { cache: 'no-store' }),
      fetch(`${api}/api/search?q=`, { cache: 'no-store' }),
    ]);
    const communities = await cR.json();
    const base = communities.map((c:any) => ({ url: `${site}/c/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 }));
    // We don't have a direct posts listing page here; include search and submit pages
    return [
      { url: site, changeFrequency: 'daily', priority: 1 },
      { url: `${site}/search`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${site}/submit`,     changeFrequency: 'weekly', priority: 0.5 },
      ...base,
    ];
  } catch {
    return [
      { url: site, changeFrequency: 'daily', priority: 1 },
      { url: `${site}/search`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${site}/submit`, changeFrequency: 'weekly', priority: 0.5 }
    ];
  }
}
