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
import { interpretBillingEvent, type BillingUpdate } from "@/lib/billing";
import { emailConfigured, sendEmail } from "@/lib/email";
import {
  subscriptionConfirmedEmail,
  subscriptionCancelledEmail,
} from "@/lib/email-templates";

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
  const update = interpretBillingEvent(event);
  if (!update) return; // not an event we act on

  // Apply the change to the org and read back its name (for the audit + email).
  let org: { id: string; name: string };
  if (update.target === "byOrg") {
    org = await prisma.organisation.update({
      where: { id: update.orgId },
      data: {
        stripeCustomerId: update.customerId ?? undefined,
        subscriptionStatus: update.status,
      },
      select: { id: true, name: true },
    });
  } else {
    const found = await prisma.organisation.findFirst({
      where: { stripeCustomerId: update.customerId },
    });
    if (!found) return; // a customer we don't recognise — nothing to do
    org = await prisma.organisation.update({
      where: { id: found.id },
      data: { subscriptionStatus: update.status },
      select: { id: true, name: true },
    });
  }

  await recordAudit({
    action: "SUBSCRIPTION_UPDATED",
    targetType: "Organisation",
    targetId: org.id,
    organisationId: org.id,
    detail: { event: event.type, status: update.status },
  });
  await captureServerEvent(
    org.id,
    update.target === "byOrg" ? "subscription_activated" : "subscription_status_changed",
    { source: event.type, status: update.status },
  );

  // Transactional email is best-effort: a send failure must never fail the webhook
  // (that would make Stripe retry the whole event).
  await sendBillingEmail(update, org.name).catch((err) =>
    console.error("billing email failed:", err),
  );
}

// Send the appropriate receipt: a confirmation when a checkout activates, a notice
// when a subscription is cancelled. No-ops when email isn't configured or we can't
// find a recipient address.
async function sendBillingEmail(
  update: BillingUpdate,
  orgName: string,
): Promise<void> {
  if (!emailConfigured()) return;

  if (update.target === "byOrg" && update.status === "active") {
    if (!update.email) return;
    const { subject, html, text } = subscriptionConfirmedEmail({ orgName });
    await sendEmail({ to: update.email, subject, html, text });
  } else if (update.target === "byCustomer" && update.status === "canceled") {
    const to = await customerEmail(update.customerId);
    if (!to) return;
    const { subject, html, text } = subscriptionCancelledEmail({ orgName });
    await sendEmail({ to, subject, html, text });
  }
}

// Look up a Stripe customer's email (cancellation events don't carry one).
async function customerEmail(customerId: string): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return (customer as Stripe.Customer).email ?? null;
  } catch (err) {
    console.error("customer email lookup failed:", err);
    return null;
  }
}
