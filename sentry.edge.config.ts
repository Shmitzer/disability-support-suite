// Sentry edge-runtime init (Phase F). Imported by src/instrumentation.ts on the
// edge runtime (proxy/middleware). Inert unless SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";
import { redactErrorPii } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: redactErrorPii,
});
