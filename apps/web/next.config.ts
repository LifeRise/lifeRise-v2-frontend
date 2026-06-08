import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use standalone output for Docker/Railway self-hosted builds only.
  // Vercel manages its own output format — standalone breaks Vercel deployments.
  // VERCEL=1 is injected automatically by the Vercel build environment.
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: true,
  // Allow GSAP and other heavy modules to be bundled client-side only
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  // Pin Turbopack's workspace root to apps/web/ to silence the "multiple
  // lockfiles" warning that fires because the monorepo root also has a
  // package-lock.json.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
