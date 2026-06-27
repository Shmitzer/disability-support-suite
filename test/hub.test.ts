// hub.test.ts — Participant Hub pure-core tests (HUB_DATA_MODEL.md). Mirrors the
// repo idiom (node:test, no DB): the decision logic hub-actions.ts wraps. Covers
// capacity→funding routing, entry stamping, RP reportable derivation, the PIN hash,
// and the cross-org timeline gate (denied without a grant). Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeCapacity,
  stampHubEntry,
  deriveRpReportable,
  hashHubPin,
  verifyHubPin,
  isValidPin,
  isHubCapacity,
  isRpType,
  participantChannel,
  HUB_TIMELINE_CAPABILITY,
} from "../src/lib/hub";
import { can, Capability, type Principal } from "../src/lib/rbac";

// ── Capacity → funding routing ────────────────────────────────────────────────────
test("WORKER capacity is billable and requires a shift", () => {
  const ok = routeCapacity("WORKER", { shiftId: "shift_1" });
  assert.deepEqual(ok, { ok: true, billable: true, shiftId: "shift_1", accessGrantId: null });
  assert.equal(routeCapacity("WORKER", {}).ok, false); // no shift → rejected
});

test("FAMILY/GUARDIAN is not billable and requires an access grant", () => {
  for (const cap of ["FAMILY", "GUARDIAN"] as const) {
    const ok = routeCapacity(cap, { accessGrantId: "grant_1" });
    assert.deepEqual(ok, { ok: true, billable: false, shiftId: null, accessGrantId: "grant_1" });
    assert.equal(routeCapacity(cap, {}).ok, false); // no grant → rejected
  }
});

test("a WORKER check-in ignores any stray accessGrantId; family ignores stray shift", () => {
  const w = routeCapacity("WORKER", { shiftId: "s", accessGrantId: "g" });
  assert.equal(w.ok && w.accessGrantId, null);
  const f = routeCapacity("FAMILY", { shiftId: "s", accessGrantId: "g" });
  assert.equal(f.ok && f.shiftId, null);
});

test("isHubCapacity / isRpType guard their unions", () => {
  assert.equal(isHubCapacity("WORKER"), true);
  assert.equal(isHubCapacity("ADMIN"), false);
  assert.equal(isRpType("CHEMICAL"), true);
  assert.equal(isRpType("verbal"), false);
});

// ── Entry stamping ────────────────────────────────────────────────────────────────
test("stampHubEntry routes the entry to the check-in (never a shift) and the owner org", () => {
  const stamp = stampHubEntry({
    hubCheckInId: "ci_1",
    participantId: "zef",
    loggedByWorkerId: "mother",
    actingCapacity: "FAMILY",
    ownerUserId: "mother",
    ownerOrganisationId: null,
    sourceDevice: "PHONE",
  });
  assert.equal(stamp.shiftId, null);
  assert.equal(stamp.hubCheckInId, "ci_1");
  assert.equal(stamp.participantId, "zef");
  assert.equal(stamp.actingCapacity, "FAMILY");
  assert.equal(stamp.userId, "mother");
  assert.equal(stamp.organisationId, null);
  assert.equal(stamp.sourceDevice, "PHONE");
});

// ── Restrictive practice ──────────────────────────────────────────────────────────
test("unauthorised RP is always reportable; authorised RP is not auto-reportable", () => {
  assert.equal(deriveRpReportable({ restrictivePractice: true, rpAuthorised: false }), true);
  assert.equal(deriveRpReportable({ restrictivePractice: true, rpAuthorised: true }), false);
  // an explicit reportable flag is still honoured even on an authorised use
  assert.equal(
    deriveRpReportable({ restrictivePractice: true, rpAuthorised: true, reportable: true }),
    true,
  );
  // a non-RP incident only reports if explicitly flagged
  assert.equal(deriveRpReportable({ restrictivePractice: false }), false);
  assert.equal(deriveRpReportable({ restrictivePractice: false, reportable: true }), true);
});

// ── Server-side PIN ───────────────────────────────────────────────────────────────
test("hub PIN: valid PINs round-trip, wrong PIN fails, format is enforced", () => {
  assert.equal(isValidPin("1234"), true);
  assert.equal(isValidPin("123"), false); // too short
  assert.equal(isValidPin("123456789"), false); // too long
  assert.equal(isValidPin("12a4"), false); // not digits

  const stored = hashHubPin("4821");
  assert.match(stored, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
  assert.equal(verifyHubPin("4821", stored), true);
  assert.equal(verifyHubPin("4822", stored), false);
  assert.equal(verifyHubPin("4821", null), false);
  assert.equal(verifyHubPin("4821", "garbage"), false);
  assert.throws(() => hashHubPin("abc")); // invalid PIN can't be hashed

  // distinct salts → distinct stored values for the same PIN
  assert.notEqual(hashHubPin("4821"), hashHubPin("4821"));
});

// ── Cross-org timeline gate ───────────────────────────────────────────────────────
// The gate is the SAME can()/grant check the access frame already enforces: an active
// grant conferring NotesRead on THIS participant, and nothing wider.
const ZEF = "participant_zef";
const motherWithGrant: Principal = {
  workerId: "mother",
  memberships: [],
  grants: [{ participantId: ZEF, role: "family_carer_clinical" }],
};
const strangerNoGrant: Principal = { workerId: "stranger", memberships: [], grants: [] };

test("timeline is visible WITH an active grant on the participant", () => {
  assert.equal(HUB_TIMELINE_CAPABILITY, Capability.NotesRead);
  assert.equal(can(motherWithGrant, HUB_TIMELINE_CAPABILITY, { participantId: ZEF }), true);
});

test("timeline is DENIED without a grant, and denied for any OTHER participant", () => {
  assert.equal(can(strangerNoGrant, HUB_TIMELINE_CAPABILITY, { participantId: ZEF }), false);
  assert.equal(can(motherWithGrant, HUB_TIMELINE_CAPABILITY, { participantId: "someone_else" }), false);
});

// ── Realtime channel ──────────────────────────────────────────────────────────────
test("the realtime channel is keyed by participant (all devices share one)", () => {
  assert.equal(participantChannel(ZEF), "hub:participant:participant_zef");
  assert.notEqual(participantChannel("a"), participantChannel("b"));
});
