// phone-tunnel.mjs — opens a public Cloudflare quick tunnel to the local dev
// server so you can test the app on your phone. Prints the *.trycloudflare.com
// link, which next.config.ts already allowlists for dev origins + Server Actions.
//
//   npm run tunnel        # assumes `npm run dev` is already running
//   npm run dev:phone     # starts the dev server AND the tunnel together
//
// Requires cloudflared on your machine (this is a local-only workflow — the
// cloud sandbox blocks the outbound port cloudflared needs):
//   macOS:   brew install cloudflared
//   Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
//   Windows: winget install --id Cloudflare.cloudflared

import { spawn } from "node:child_process";

const PORT = process.env.PORT ?? "3000";
const ORIGIN = `http://localhost:${PORT}`;
const withDev = process.argv.includes("--dev");

const children = [];
let printedLink = false;

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function watchForLink(stream) {
  stream.on("data", (chunk) => {
    const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !printedLink) {
      printedLink = true;
      const url = match[0];
      const bar = "─".repeat(url.length + 4);
      console.log(`\n┌${bar}┐`);
      console.log(`│  ${url}  │`);
      console.log(`└${bar}┘`);
      console.log("📱 Open that link on your phone (Ctrl+C here to stop).\n");
    }
  });
}

if (withDev) {
  console.log(`Starting dev server on ${ORIGIN} ...`);
  const dev = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });
  children.push(dev);
  dev.on("exit", (code) => shutdown(code ?? 0));
}

console.log(`Opening Cloudflare tunnel to ${ORIGIN} ...`);
const tunnel = spawn("cloudflared", ["tunnel", "--url", ORIGIN], {
  stdio: ["ignore", "pipe", "pipe"],
});
children.push(tunnel);

watchForLink(tunnel.stdout);
watchForLink(tunnel.stderr); // cloudflared logs the URL to stderr
tunnel.stdout.pipe(process.stdout);
tunnel.stderr.pipe(process.stderr);

tunnel.on("error", (err) => {
  if (err.code === "ENOENT") {
    console.error(
      "\n✖ cloudflared not found. Install it first:\n" +
        "  macOS:   brew install cloudflared\n" +
        "  Windows: winget install --id Cloudflare.cloudflared\n" +
        "  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n"
    );
  } else {
    console.error("\n✖ Failed to start cloudflared:", err.message);
  }
  shutdown(1);
});
tunnel.on("exit", (code) => shutdown(code ?? 0));
