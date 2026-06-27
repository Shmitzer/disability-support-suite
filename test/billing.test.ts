// Unit tests for the pure Stripe-event interpreter (src/lib/billing.ts). No network,
// no SDK at runtime (the Stripe import is type-only) — events are plain fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { interpretBillingEvent } from "../src/lib/billing";

// Minimal event fixture — only the fields the interpreter reads.
function evt(type: string, object: unknown): Stripe.Event {
  return { type, data: { object } } as unknown as Stripe.Event;
}

test("checkout.session.completed → byOrg active, with billing email", () => {
  const u = interpretBillingEvent(
    evt("checkout.session.completed", {
      client_reference_id: "org_1",
      customer: "cus_1",
      customer_details: { email: "admin@example.com" },
    }),
  );
  assert.deepEqual(u, {
    target: "byOrg",
    orgId: "org_1",
    customerId: "cus_1",
    status: "active",
    email: "admin@example.com",
  });
});

test("checkout without client_reference_id → null (can't map to an org)", () => {
  const u = interpretBillingEvent(
    evt("checkout.session.completed", { customer: "cus_1" }),
  );
  assert.equal(u, null);
});

test("checkout: expanded customer object + customer_email fallback", () => {
  const u = interpretBillingEvent(
    evt("checkout.session.completed", {
      client_reference_id: "org_2",
      customer: { id: "cus_2" },
      customer_email: "fallback@example.com",
    }),
  );
  assert.ok(u && u.target === "byOrg");
  assert.equal(u.customerId, "cus_2");
  assert.equal(u.email, "fallback@example.com");
});

test("customer.subscription.updated → byCustomer mirrors Stripe status", () => {
  const u = interpretBillingEvent(
    evt("customer.subscription.updated", { customer: "cus_3", status: "past_due" }),
  );
  assert.deepEqual(u, { target: "byCustomer", customerId: "cus_3", status: "past_due" });
});

test("customer.subscription.deleted → byCustomer canceled (regardless of status)", () => {
  const u = interpretBillingEvent(
    evt("customer.subscription.deleted", { customer: "cus_4", status: "active" }),
  );
  assert.deepEqual(u, { target: "byCustomer", customerId: "cus_4", status: "canceled" });
});

test("subscription event with no customer → null", () => {
  const u = interpretBillingEvent(
    evt("customer.subscription.updated", { status: "active" }),
  );
  assert.equal(u, null);
});

test("unrelated event type → null", () => {
  assert.equal(interpretBillingEvent(evt("invoice.paid", {})), null);
});
