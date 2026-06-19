import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // --- Phone testing via Cloudflare tunnel (*.trycloudflare.com) ---
  // Next 16 blocks cross-origin requests to the dev server AND cross-origin
  // Server Actions by default (CSRF protection). When the app is reached through
  // a Cloudflare quick tunnel, the browser's origin is a *.trycloudflare.com URL,
  // so without these two allowlists the app would load but every button/save
  // (Server Actions) would be rejected. The wildcard covers the random tunnel
  // name Cloudflare assigns each run. See node_modules/next/dist/docs:
  //   allowedDevOrigins.md  and  serverActions.md
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
