import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow Z.ai preview domains to access _next/* resources during development
  allowedDevOrigins: [
    "*.space-z.ai",
    "preview-*.space-z.ai",
    "*.preview-*.space-z.ai",
  ],
};

export default nextConfig;
