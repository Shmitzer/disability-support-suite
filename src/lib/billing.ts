// billing.ts — pure interpretation of Stripe billing webhook events, split out so it
// can be unit-tested without the network or a database. The webhook route applies
// the result (DB update + audit + analytics + email); this module only DECIDES.

import type Stripe from "stripe";

// A normalised "what changed" derived from a Stripe event:
//   • byOrg      — a completed checkout we can map straight to an org (via the
//                  client_reference_id we set when starting checkout).
//   • byCustomer — a subscription change we map to an org by its Stripe customer id.
export type BillingUpdate =
  | {
      target: "byOrg";
      orgId: string;
      customerId: string | null;
      status: string;
      email: string | null; // billing email from checkout, for the receipt
    }
  | { target: "byCustomer"; customerId: string; status: string };

// Stripe gives `customer` as an id, an expanded object, or null — normalise to an id.
function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

// Translate a Stripe event into a BillingUpdate, or null for events we don't act on.
export function interpretBillingEvent(event: Stripe.Event): BillingUpdate | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.client_reference_id) return null; // can't map it to an org
      return {
        target: "byOrg",
        orgId: session.client_reference_id,
        customerId: customerIdOf(session.customer),
        status: "active",
        email: session.customer_details?.email ?? session.customer_email ?? null,
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = customerIdOf(sub.customer);
      if (!customerId) return null;
      return {
        target: "byCustomer",
        customerId,
        // A deletion is a cancellation; otherwise mirror Stripe's own status.
        status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
      };
    }
    default:
      return null;
  }
}
