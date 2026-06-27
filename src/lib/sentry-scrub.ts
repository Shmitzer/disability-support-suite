// sentry-scrub.ts — defence-in-depth PII redaction for Sentry events (Rule 2).
//
// A thrown error's message/stack should never carry a participant identifier to an
// external service. This redacts the structured identifiers (email / NDIS number /
// phone) from an event's message and exception values before it's sent. It mirrors the
// structured-identifier regexes in src/lib/pii.ts but stays self-contained and uses only
// string ops, so it's safe to load from the edge-runtime Sentry config too.
//
// Wired as `beforeSend` in sentry.server.config.ts and sentry.edge.config.ts. Inert in
// practice unless SENTRY_DSN is set (Sentry is disabled otherwise).

import type { ErrorEvent } from "@sentry/nextjs";

function redact(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[redacted email]")
    .replace(/\b\d{9}\b/g, "[redacted id]") // NDIS numbers are 9 digits
    .replace(/(?:\+?61|\b0)[\s-]?\d(?:[\s-]?\d){7,9}\b/g, "[redacted phone]");
}

export function redactErrorPii(event: ErrorEvent): ErrorEvent {
  if (typeof event.message === "string") {
    event.message = redact(event.message);
  }
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === "string") ex.value = redact(ex.value);
  }
  return event;
}
