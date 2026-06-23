// API route: POST /api/stripe/webhook — Stripe's server-to-server event feed.
//
// Public (Stripe has no session) but authenticated by SIGNATURE: we verify the
// stripe-signature header against STRIPE_WEBHOOK_SECRET on the RAW body before
// trusting anything. Subscription state lands on Organisation; every change is
// written to the AuditLog (Rule 9). Node runtime (the Stripe SDK isn't edge-safe).

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { captureServerEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // constructEvent needs the exact raw body — do not JSON.parse first.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Report to Sentry (inert without a DSN) and 500 so Stripe retries the event.
    console.error("stripe webhook handling failed:", err);
    Sentry.captureException(err, { tags: { stripeEvent: event.type } });
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.client_reference_id;
      if (!orgId) break;
      const customerId =
        typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
      await prisma.organisation.update({
        where: { id: orgId },
        data: {
          stripeCustomerId: customerId ?? undefined,
          subscriptionStatus: "active",
        },
      });
      await recordAudit({
        action: "SUBSCRIPTION_UPDATED",
        targetType: "Organisation",
        targetId: orgId,
        organisationId: orgId,
        detail: { event: event.type, status: "active" },
      });
      await captureServerEvent(orgId, "subscription_activated", {
        source: event.type,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const org = await prisma.organisation.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!org) break;
      const status =
        event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      await prisma.organisation.update({
        where: { id: org.id },
        data: { subscriptionStatus: status },
      });
      await recordAudit({
        action: "SUBSCRIPTION_UPDATED",
        targetType: "Organisation",
        targetId: org.id,
        organisationId: org.id,
        detail: { event: event.type, status },
      });
      await captureServerEvent(org.id, "subscription_status_changed", {
        source: event.type,
        status,
      });
      break;
    }
    default:
      break;
  }
}
