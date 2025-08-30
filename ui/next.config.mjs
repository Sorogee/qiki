/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don’t fail the production build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don’t fail the production build on TS type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
