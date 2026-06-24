// Unit tests for the capability layer (src/lib/rbac.ts) and the legacy role
// predicates that now delegate to it (src/lib/enums.ts). These pin the
// authorization FRAME: the goal is that adding the enterprise 32-role model is a
// change to ROLE_CAPABILITIES only — so we assert (a) gates ask capabilities,
// (b) deny-by-default holds, and (c) the legacy wrappers still match old behaviour.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { can, capabilitiesFor, Capability, ROLE_CAPABILITIES } from "../src/lib/rbac";
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
