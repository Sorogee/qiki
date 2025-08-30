export default function Head() {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const title = 'Search';
  const description = 'Search posts and communities';
  const og = '/api/og/community?slug=home';

  return (
    <>
      <title>{title} • Qiki</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${SITE}${og}`} />
      <link rel="canonical" href={`${SITE}/search`} />
    </>
  );
}
