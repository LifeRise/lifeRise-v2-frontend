import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds.
  // The Dockerfile at apps/web/Dockerfile depends on .next/standalone.
  output: "standalone",
  reactStrictMode: true,
  // Allow GSAP and other heavy modules to be bundled client-side only
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;
