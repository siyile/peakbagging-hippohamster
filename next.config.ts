import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev",
      },
    ],
  },
};

export default nextConfig;
