import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./src/lib/redirects";

// Legacy public bucket URL; kept so images referenced before the custom
// domain switch (stored in post content) continue to render.
const LEGACY_R2_HOSTNAME = "pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev";

// Some redirect destinations contain spaces (e.g. /tags/North Cascades).
// The routing layer emits destinations verbatim, so encode each segment
// while preserving the / separators.
const encodePathSegments = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Resolved in Vercel's routing layer before any compute, so these no longer
  // bill middleware CPU on every request.
  async redirects() {
    return [
      // Specific mappings must come before the patterns below: first match
      // wins, and /posts/:region/:peak or /tags/:tag/page/:n would otherwise
      // swallow entries that need a named destination.
      ...Object.entries(LEGACY_REDIRECTS).map(([source, destination]) => ({
        source,
        destination: encodePathSegments(destination),
        permanent: true,
      })),
      // Hugo's paginated and taxonomy URL shapes existed for every tag and
      // category, so listing them one page at a time left gaps that 404'd
      // (/page/3, /categories/scramble/page/2). Match the shape instead.
      // These destinations carry route params, so they skip
      // encodePathSegments — it would percent-encode the ":" too.
      { source: "/page/:n", destination: "/posts", permanent: true },
      { source: "/categories/:category", destination: "/posts", permanent: true },
      {
        source: "/categories/:category/page/:n",
        destination: "/posts",
        permanent: true,
      },
      // Drops the pagination and lets the specific entries above map the tag
      // name if it needs one.
      { source: "/tags/:tag/page/:n", destination: "/tags/:tag", permanent: true },
      // Old post URLs always had exactly two segments under /posts; current
      // posts live at /posts/{slug}. Send unmapped stragglers to the index so
      // no old URL hard-404s. Note this shadows any future two-segment route
      // under /posts — none exists today.
      {
        source: "/posts/:region/:peak",
        destination: "/posts",
        permanent: true,
      },
    ];
  },
  // Keep *.vercel.app (production alias + preview deploys) out of search
  // indexes so they don't compete with the canonical www.hippohamster.com.
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: ".*\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
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
