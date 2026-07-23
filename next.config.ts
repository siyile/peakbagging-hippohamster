import type { NextConfig } from "next";

// Legacy public bucket URL; kept so images referenced before the custom
// domain switch (stored in post content) continue to render.
const LEGACY_R2_HOSTNAME = "pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev";

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

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
      { protocol: "https" as const, hostname: LEGACY_R2_HOSTNAME },
      ...(r2PublicHostname && r2PublicHostname !== LEGACY_R2_HOSTNAME
        ? [{ protocol: "https" as const, hostname: r2PublicHostname }]
        : []),
    ],
  },
};

export default nextConfig;
