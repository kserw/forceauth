/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
  },
  // Skip linting during build (we'll run it separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript errors during build for faster iteration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
