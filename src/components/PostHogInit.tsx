// PostHogInit.tsx — initialises client-side PostHog, only when a public key is
// configured (Phase F) AND the user has granted analytics consent. Renders nothing.
// Consent is gated via lib/analytics-consent (the banner is cd's); if consent is
// given later, the event listener starts capture without a reload.

"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { hasAnalyticsConsent, ANALYTICS_CONSENT_EVENT } from "@/lib/analytics-consent";

export function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    function start() {
      if (posthog.__loaded || !hasAnalyticsConsent()) return; // wait for consent
      posthog.init(key!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        capture_pageview: true,
        person_profiles: "identified_only",
      });
    }

    start(); // already-consented users
    window.addEventListener(ANALYTICS_CONSENT_EVENT, start); // consent given this session
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, start);
  }, []);

  return null;
}
