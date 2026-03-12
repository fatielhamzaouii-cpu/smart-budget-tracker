import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default.
  // Empty turbopack config silences the "webpack config ignored" warning.
  turbopack: {},
};

export default nextConfig;
