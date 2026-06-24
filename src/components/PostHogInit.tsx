// PostHogInit.tsx — initialises client-side PostHog once on mount, only when a
// public key is configured (Phase F). Renders nothing. Pageviews are captured
// automatically; product events can be sent with `posthog.capture(...)`.

"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      person_profiles: "identified_only",
    });
  }, []);

  return null;
}
