// analytics.ts — server-side PostHog product analytics (Phase F). Client-side
// pageview capture lives in components/PostHogInit.tsx. Env-gated: without
// NEXT_PUBLIC_POSTHOG_KEY this no-ops.
//
// In a serverless environment each invocation is short-lived, so we flush
// immediately (flushAt:1) and shut down after each capture to guarantee delivery.

import { PostHog } from "posthog-node";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function analyticsConfigured(): boolean {
  return Boolean(key);
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!key) return;
  const client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });
  try {
    client.capture({ distinctId, event, properties });
    await client.shutdown();
  } catch (err) {
    console.error("captureServerEvent failed:", err);
  }
}
