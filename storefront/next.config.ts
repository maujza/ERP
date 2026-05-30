/**
 * next.config.ts — Next.js build and runtime configuration
 *
 * Key responsibilities:
 *
 * 1. API proxy (rewrites): Any browser request to /api/medusa/* is forwarded
 *    server-side to the Medusa backend. This keeps the backend URL out of the
 *    browser bundle and avoids CORS issues between the two origins.
 *    The rewrite target is MEDUSA_INTERNAL_BACKEND_URL (a Docker-internal URL).
 *
 * 2. Standalone output: Produces a self-contained .next/standalone/ folder that
 *    can run in a Docker container without the full node_modules directory.
 *
 * 3. Image domains (remotePatterns): Next.js's <Image> component blocks external
 *    images from unlisted domains for security. Add new CDNs here when needed.
 */

// NextConfig — TypeScript type for the Next.js config object (enables autocompletion)
import type { NextConfig } from "next";

// MEDUSA_INTERNAL_BACKEND_URL — Docker-internal URL used server-side only by the rewrite proxy.
// In Docker this is http://backend:9000; locally it falls back to http://localhost:9000.
const medusaInternalBackendUrl =
  process.env.MEDUSA_INTERNAL_BACKEND_URL || "http://localhost:9000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        // Proxy: browser calls /api/medusa/store/products → backend:9000/store/products
        // This keeps the Medusa backend URL private and avoids CORS preflight requests
        source: "/api/medusa/:path*",
        destination: `${medusaInternalBackendUrl}/:path*`,
      },
    ];
  },
  images: {
    // Allowlist of external hostnames from which next/image can serve images.
    // Unlisted origins are blocked by Next.js (returns a 400 error).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },        // placeholder/demo images
      { protocol: "https", hostname: "**.amazonaws.com" },           // AWS S3 (legacy uploads)
      { protocol: "https", hostname: "**.medusajs.com" },            // Medusa demo assets
      { protocol: "http",  hostname: "localhost", port: "9000" },    // local Medusa dev server
      { protocol: "https", hostname: "pub-*.r2.dev" },               // Cloudflare R2 public CDN
    ],
  },
};

export default nextConfig;
