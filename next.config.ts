import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated routes read the request session on every render, so Cache
  // Components is left off until the app has stable per-tenant caching needs.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
