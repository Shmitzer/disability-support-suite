// instrumentation-client.ts — Next.js client startup hook (Phase F). Initialises
// browser-side Sentry, inert unless NEXT_PUBLIC_SENTRY_DSN is set.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
