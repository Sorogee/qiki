export default function Head() {
  const SITE = {process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'};
  const title = "Search";
  const description = "Search posts and communities";
  const og = "/api/og/community?slug=home";
  return (
    <>
      <title>{title} · Qikiworld</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={SITE} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={og} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={og} />
    </>
  );
}