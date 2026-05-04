import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Load .env.local before any app code runs (ensures DATABASE_URL in all server contexts)
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
