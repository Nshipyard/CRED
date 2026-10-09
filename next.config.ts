import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // CRED pages fetch live data per request; classic dynamic routing behavior.
  cacheComponents: false,
  // resvg-js ships a native addon; load it at runtime, not through the bundler.
  serverExternalPackages: ["@resvg/resvg-js"],
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
