import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  // Do NOT bundle pdf-parse or pdfjs-dist on the server.
  // They use dynamic relative imports (pdf.worker.mjs) that break when bundled
  // into Next.js chunks. Keeping them external lets Node.js load them directly
  // from node_modules where relative paths work correctly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
