import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — required for Cloudflare Pages / EdgeOne Pages deployment.
  // Vercel deployment still works with this flag enabled.
  output: "export",

  // Static export doesn't support Next.js Image Optimization runtime,
  // so unoptimize all <Image> usage. Tradeoff: no automatic resizing.
  images: {
    unoptimized: true,
  },

  // Produce clean trailing-slash URLs (helps with some static hosts)
  trailingSlash: true,
};

export default nextConfig;
