// stripe.ts — the ONE place the app talks to Stripe (Phase F billing).
//
// Env-gated and inert without keys: stripeConfigured() is false until the secret
// key is set, so the checkout/portal actions and the webhook no-op in dev. The
// plan price lives in Stripe (referenced by id from env) — no pricing is hard-coded
// here, so plans/prices are changed in the dashboard, not in code.

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
// Absolute base URL for Stripe's success/cancel/return redirects.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function stripeConfigured(): boolean {
  return Boolean(secretKey);
}

// One shared Stripe client. apiVersion is intentionally omitted so the SDK uses
// its own pinned version (avoids a version-literal mismatch on upgrade).
let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  }
  client ??= new Stripe(secretKey);
  return client;
}
