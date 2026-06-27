// Sentry server-side init (Phase F). Imported by src/instrumentation.ts on the
// Node runtime. Inert unless SENTRY_DSN is set (enabled:false → no network).
import * as Sentry from "@sentry/nextjs";
import { redactErrorPii } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  // Never attach request bodies / cookies / user IP by default (PII/health app).
  sendDefaultPii: false,
  // Defence-in-depth (Rule 2): redact structured identifiers from any error text
  // before it leaves the app, in case a thrown error embeds an email/phone/NDIS number.
  beforeSend: redactErrorPii,
});
