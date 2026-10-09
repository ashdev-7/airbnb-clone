import type { NextConfig } from "next";

// Server side only. The browser never learns this address: it calls /api on our own origin.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // The end-to-end tests build into a folder of their own (frontend/e2e/stack.mjs), so a
  // test run never replaces the build or the dev server of someone working on the app.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Listing photos are free-licence files on the Unsplash CDN (plan §7.2); nothing else
    // may be fetched through the image optimiser.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
  // Same-origin API: cookies stay first-party and no CORS configuration is needed.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
