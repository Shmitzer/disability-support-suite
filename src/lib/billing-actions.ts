// billing-actions.ts — server actions that send the current organisation to Stripe
// Checkout and the Billing Portal (Phase F). Billing is at the ORGANISATION level
// (the org pays); solo workers can reuse these helpers against Worker later.
//
// Inert without Stripe keys: each action returns early when Stripe isn't configured.
// redirect() throws a control-flow signal, so it stays OUTSIDE any try/catch and is
// the last thing each action does.

"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isRosteringRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { captureServerEvent } from "@/lib/analytics";
import {
  getStripe,
  stripeConfigured,
  STRIPE_PRICE_ID,
  APP_URL,
} from "@/lib/stripe";

// Start a subscription checkout for the current org. Stripe Tax is enabled so AU
// GST is calculated automatically (Rule 9 follow-up: receipts/tax).
export async function startCheckout() {
  if (!stripeConfigured() || !STRIPE_PRICE_ID) return;

  // Billing is admin-managed: re-check the role on the SERVER (the page only hides
  // the button; a server action is a callable endpoint on its own).
  const user = await getCurrentUser();
  if (!user?.organisationId || !isRosteringRole(user.role)) return;
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  });
  if (!org) return;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: org.id, // the webhook maps the session back to the org
    customer: org.stripeCustomerId ?? undefined,
    customer_update: org.stripeCustomerId ? { address: "auto" } : undefined,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${APP_URL}/billing?status=success`,
    cancel_url: `${APP_URL}/billing?status=cancelled`,
  });

  // Analytics is best-effort and must not block the redirect (captureServerEvent
  // swallows its own errors). distinctId is the org — billing is an org-level event.
  await captureServerEvent(org.id, "billing_checkout_started", {
    priceId: STRIPE_PRICE_ID,
    actorId: user.id,
  });

  if (session.url) redirect(session.url);
}

// Open the Stripe Billing Portal so the org can manage/cancel its subscription.
export async function openBillingPortal() {
  if (!stripeConfigured()) return;

  // Admin-only, enforced server-side (see startCheckout).
  const user = await getCurrentUser();
  if (!user?.organisationId || !isRosteringRole(user.role)) return;
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  });
  if (!org?.stripeCustomerId) return;

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  });

  if (session.url) redirect(session.url);
}
