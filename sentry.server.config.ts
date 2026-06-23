// Sentry server-side init (Phase F). Imported by src/instrumentation.ts on the
// Node runtime. Inert unless SENTRY_DSN is set (enabled:false → no network).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
});
