import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // CRED pages fetch live data per request; classic dynamic routing behavior.
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
