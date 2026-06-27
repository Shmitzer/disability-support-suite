// instrumentation.ts — Next.js startup hook (runs once per runtime). Loads the
// Sentry init for whichever runtime we're on, and forwards nested React Server
// Component request errors to Sentry. All inert unless SENTRY_DSN is set.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
