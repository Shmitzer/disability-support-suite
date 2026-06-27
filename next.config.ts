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
  //
  // LAN testing (same Wi-Fi) uses the laptop's local IP. Accessing it is same-origin
  // so Server Actions already pass; the IP is listed here only to silence Next's
  // cross-origin dev-asset warning. Update it if your laptop's IP changes
  // (`ipconfig`, or read the "Network:" line `next dev` prints).
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.1.107"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "192.168.1.107:3000"],
    },
  },
};

export default nextConfig;
