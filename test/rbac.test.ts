// Unit tests for the capability layer (src/lib/rbac.ts) and the legacy role
// predicates that now delegate to it (src/lib/enums.ts). These pin the
// authorization FRAME: the goal is that adding the enterprise 32-role model is a
// change to ROLE_CAPABILITIES only — so we assert (a) gates ask capabilities,
// (b) deny-by-default holds, and (c) the legacy wrappers still match old behaviour.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  can,
  capabilitiesFor,
  grantCapabilitiesFor,
  Capability,
  ROLE_CAPABILITIES,
  GRANT_ROLE_CAPABILITIES,
  type Principal,
} from "../src/lib/rbac";
import { Role, isRosteringRole, isWorkerRole } from "../src/lib/enums";

test("can: ADMIN holds the manager capabilities", () => {
  assert.equal(can(Role.ADMIN, Capability.RosterManage), true);
  assert.equal(can(Role.ADMIN, Capability.ClockAmend), true);
  assert.equal(can(Role.ADMIN, Capability.BillingManage), true);
  assert.equal(can(Role.ADMIN, Capability.ShiftReadOrg), true);
  assert.equal(can(Role.ADMIN, Capability.AuditRead), true);
});

test("can: front-line roles work shifts but cannot manage", () => {
  for (const role of [Role.WORKER, Role.SOLO_WORKER]) {
    assert.equal(can(role, Capability.ShiftWork), true);
    assert.equal(can(role, Capability.RosterManage), false);
    assert.equal(can(role, Capability.BillingManage), false);
  }
});

test("can: deny-by-default for null / unknown roles and unseeded roles", () => {
  assert.equal(can(null, Capability.ShiftWork), false);
  assert.equal(can(undefined, Capability.RosterManage), false);
  assert.equal(can("NOT_A_ROLE", Capability.RosterManage), false);
  // SUPERVISOR / PARTICIPANT / SUPERADMIN are reserved seats with nothing granted yet.
  assert.equal(can(Role.SUPERVISOR, Capability.RosterManage), false);
  assert.equal(can(Role.PARTICIPANT, Capability.ShiftWork), false);
  assert.equal(can(Role.SUPERADMIN, Capability.AuditRead), false);
});

test("capabilitiesFor: unknown role yields the empty set", () => {
  assert.deepEqual(capabilitiesFor("???"), []);
  assert.deepEqual(capabilitiesFor(null), []);
});

test("every declared Role has a capability entry (exhaustive policy map)", () => {
  for (const role of Object.values(Role)) {
    assert.ok(role in ROLE_CAPABILITIES, `missing ROLE_CAPABILITIES entry for ${role}`);
  }
});

test("legacy predicates match the capability layer (no behaviour drift)", () => {
  // isRosteringRole ≙ RosterManage; isWorkerRole ≙ ShiftWork.
  assert.equal(isRosteringRole(Role.ADMIN), true);
  assert.equal(isRosteringRole(Role.WORKER), false);
  assert.equal(isRosteringRole(null), false);
  assert.equal(isWorkerRole(Role.WORKER), true);
  assert.equal(isWorkerRole(Role.SOLO_WORKER), true);
  assert.equal(isWorkerRole(Role.ADMIN), false);
});

// --- Grant roles + principal/resource resolution ---------------------------

test("grant roles are seeded and distinct from org roles", () => {
  assert.deepEqual(grantCapabilitiesFor("family_carer_clinical"), GRANT_ROLE_CAPABILITIES.family_carer_clinical);
  assert.ok(grantCapabilitiesFor("family_carer_clinical").includes(Capability.MedicationSubmit));
  assert.ok(grantCapabilitiesFor("participant_guardian").includes(Capability.ConsentManage));
  // A grant role is NOT an org role and vice-versa (separate namespaces).
  assert.deepEqual(capabilitiesFor("family_carer_clinical"), []);
  assert.deepEqual(grantCapabilitiesFor(Role.ADMIN), []);
});

test("can(principal): org-membership capability is scoped to the matching org", () => {
  const admin: Principal = {
    workerId: "wkr_admin",
    memberships: [{ organisationId: "org_a", role: Role.ADMIN }],
    grants: [],
  };
  assert.equal(can(admin, Capability.RosterManage, { organisationId: "org_a" }), true);
  // Same capability, a DIFFERENT org → denied (no cross-tenant authority).
  assert.equal(can(admin, Capability.RosterManage, { organisationId: "org_b" }), false);
});

test("can(principal): platform admin overrides everything", () => {
  const root: Principal = { workerId: "root", memberships: [], grants: [], platformAdmin: true };
  assert.equal(can(root, Capability.BillingManage, { organisationId: "any" }), true);
  assert.equal(can(root, Capability.MedicationSubmit, { participantId: "anyone" }), true);
});

test("can(principal): union of org roles AND participant grants", () => {
  // A worker who is org staff for org_a AND an external carer for one participant.
  const hybrid: Principal = {
    workerId: "wkr_hybrid",
    memberships: [{ organisationId: "org_a", role: Role.WORKER }],
    grants: [{ participantId: "p_zef", role: "family_carer_clinical" }],
  };
  assert.equal(can(hybrid, Capability.ShiftWork, { organisationId: "org_a" }), true); // org path
  assert.equal(can(hybrid, Capability.NotesRead, { participantId: "p_zef" }), true); // grant path
});

test("can() still supports the legacy bare-role form", () => {
  assert.equal(can(Role.ADMIN, Capability.RosterManage), true);
  assert.equal(can(Role.WORKER, Capability.RosterManage), false);
});
