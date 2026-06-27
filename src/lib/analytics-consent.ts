// analytics-consent.ts — client-side consent gate for NON-essential analytics
// (PostHog). Logic only: the consent BANNER is cd's (design); this is the flag it
// flips and that PostHogInit reads. Until consent is granted, analytics must not fire.
//
// Stored in localStorage. setAnalyticsConsent() also dispatches an event so a
// already-mounted PostHogInit can start capturing the moment consent is given.

const KEY = "caira_analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "caira-analytics-consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

// Whether the user has made a choice at all (so cd knows whether to show the banner).
export function analyticsConsentChosen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, granted ? "1" : "0");
  } catch {
    /* storage unavailable — best effort */
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: granted }));
}
