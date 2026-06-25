// The NLS / Zef / mother scenario — the acceptance test for the participant-grant
// half of the RBAC frame.
//
// Story: Zef is an NLS participant. His mother is an EXTERNAL carer (not org staff)
// with clinical involvement. She is granted `family_carer_clinical` against Zef —
// and ONLY Zef. The frame must let her:
//   • view Zef's notes
//   • submit a medication record for Zef
//   • submit a routine entry for Zef
//   • receive Zef's handover
//   • submit feedback about Zef's support
// …and NOTHING else: not the same actions on any other participant, and none of
// the org-staff capabilities anywhere. Every decision is auditable.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { can, Capability, type Principal } from "../src/lib/rbac";
import { accessAuditEntry, isGrantActive } from "../src/lib/access";

const ZEF = "participant_zef";
const OTHER = "participant_other";

// Zef's mother: one active grant on Zef, no org membership.
const mother: Principal = {
  workerId: "carer_mother",
  memberships: [],
  grants: [{ participantId: ZEF, role: "family_carer_clinical" }],
};

// The five capabilities her grant is meant to confer, on Zef.
const ALLOWED_ON_ZEF = [
  Capability.NotesRead,
  Capability.MedicationSubmit,
  Capability.RoutineSubmit,
  Capability.HandoverReceive,
  Capability.FeedbackSubmit,
];

test("external carer CAN do exactly her five things — for Zef", () => {
  for (const cap of ALLOWED_ON_ZEF) {
    assert.equal(can(mother, cap, { participantId: ZEF }), true, `expected allow: ${cap} on Zef`);
  }
});

test("external carer CANNOT do those things for any OTHER participant", () => {
  for (const cap of ALLOWED_ON_ZEF) {
    assert.equal(
      can(mother, cap, { participantId: OTHER }),
      false,
      `expected deny: ${cap} on another participant`,
    );
  }
});

test("external carer holds NO org-staff capabilities anywhere", () => {
  const orgCaps = [
    Capability.RosterManage,
    Capability.ClockAmend,
    Capability.BillingManage,
    Capability.ShiftReadOrg,
    Capability.AuditRead,
    Capability.ConsentManage, // guardian-only, not a clinical carer
  ];
  for (const cap of orgCaps) {
    assert.equal(can(mother, cap, { participantId: ZEF }), false, `expected deny: ${cap} on Zef`);
    assert.equal(can(mother, cap, { organisationId: "org_nls" }), false, `expected deny: ${cap} org-wide`);
  }
});

test("a participant-scoped capability needs a participant resource (no blanket grant)", () => {
  // Without naming Zef as the resource, the grant path can't fire.
  assert.equal(can(mother, Capability.NotesRead), false);
  assert.equal(can(mother, Capability.NotesRead, { organisationId: "org_nls" }), false);
});

test("a revoked or expired grant confers nothing (active-grant gating)", () => {
  const t = new Date("2026-06-24T00:00:00.000Z");
  assert.equal(isGrantActive({ status: "REVOKED", startsAt: null, expiresAt: null }, t), false);
  assert.equal(
    isGrantActive({ status: "ACTIVE", startsAt: null, expiresAt: new Date("2026-06-01T00:00:00Z") }, t),
    false,
  );
  assert.equal(
    isGrantActive({ status: "ACTIVE", startsAt: new Date("2026-07-01T00:00:00Z"), expiresAt: null }, t),
    false,
  );
  assert.equal(isGrantActive({ status: "ACTIVE", startsAt: null, expiresAt: null }, t), true);

  // If resolvePrincipal dropped an expired grant, can() sees an empty grant list.
  const lapsed: Principal = { workerId: "carer_mother", memberships: [], grants: [] };
  assert.equal(can(lapsed, Capability.NotesRead, { participantId: ZEF }), false);
});

test("every access decision is auditable — allow and deny both produce a record", () => {
  const allow = accessAuditEntry(mother, Capability.MedicationSubmit, { participantId: ZEF }, true);
  assert.equal(allow.action, "ACCESS_GRANTED");
  assert.equal(allow.targetType, "Participant");
  assert.equal(allow.targetId, ZEF);
  assert.equal(allow.actorId, "carer_mother");
  assert.deepEqual(allow.detail, { capability: Capability.MedicationSubmit, allowed: true });

  const deny = accessAuditEntry(mother, Capability.RosterManage, { participantId: OTHER }, false);
  assert.equal(deny.action, "ACCESS_DENIED");
  assert.equal(deny.targetId, OTHER);
});
