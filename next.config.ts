import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Raise the buffered request-body limit (default 10MB) so larger
    // image/GPX uploads to /api/upload aren't truncated.
    proxyClientMaxBodySize: "25mb",
  },
  images: {
    // Uploaded images are immutable, so cache optimized variants for 31 days
    // to avoid repeated transformations (Vercel free tier: 5,000/month).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev",
      },
    ],
  },
};

export default nextConfig;
