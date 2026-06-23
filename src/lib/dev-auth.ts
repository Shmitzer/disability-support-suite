// dev-auth.ts — the single switch for the local/sandbox auth bypass (runbook E4).
//
// When DEV_AUTH=1 the app uses the dev role-switch cookie instead of Supabase
// Auth, which isn't reachable from the sandbox. Hard-gated on NODE_ENV so it can
// NEVER activate in a production build, even if the env var leaks in — the Vercel
// production deploy must never ship this enabled.
//
// Edge-safe on purpose: this reads only process.env and imports nothing, so the
// proxy/middleware (edge runtime, no Prisma) can import it too.
export const DEV_AUTH =
  process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production";
