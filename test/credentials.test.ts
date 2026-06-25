// Tests for the pure credential helpers (src/lib/credentials.ts) incl. the competency
// mapping that gates high-intensity supports.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  credentialStatus,
  isUsable,
  requiredCredentialForNeed,
} from "../src/lib/credentials";
import { SupportNeed } from "../src/lib/care-needs";

const now = new Date("2026-06-25T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

test("credentialStatus: none/valid/expiring/expired", () => {
  assert.equal(credentialStatus(null, now), "VALID"); // no expiry
  assert.equal(credentialStatus(inDays(120), now), "VALID");
  assert.equal(credentialStatus(inDays(10), now), "EXPIRING"); // within 30d
  assert.equal(credentialStatus(inDays(-1), now), "EXPIRED");
});

test("isUsable: valid + expiring usable, expired not", () => {
  assert.equal(isUsable("VALID"), true);
  assert.equal(isUsable("EXPIRING"), true);
  assert.equal(isUsable("EXPIRED"), false);
  assert.equal(isUsable("NONE"), false);
});

test("requiredCredentialForNeed: high-intensity needs require a credential; others don't", () => {
  assert.equal(requiredCredentialForNeed(SupportNeed.Seizures), "epilepsy_management");
  assert.equal(requiredCredentialForNeed(SupportNeed.EnteralFeeding), "enteral_feeding");
  assert.equal(requiredCredentialForNeed(SupportNeed.Catheter), "urinary_catheter");
  // Non-high-intensity → no credential gate.
  assert.equal(requiredCredentialForNeed(SupportNeed.CommunicationAac), null);
  assert.equal(requiredCredentialForNeed("not_a_need"), null);
});
