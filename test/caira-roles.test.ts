// Unit tests for the Caira persona + web-access guardrail helpers
// (src/lib/caira/roles.ts). These pin the participant lockout — the most
// safety-critical invariant in the Caira feature.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { Role } from "../src/lib/enums";
import { cairaPersona, webAccessAllowedForRole, canManageWebAccess } from "../src/lib/caira/roles";

test("cairaPersona: maps roles to the three personas", () => {
  assert.equal(cairaPersona(Role.WORKER), "worker");
  assert.equal(cairaPersona(Role.SOLO_WORKER), "worker");
  assert.equal(cairaPersona(Role.PARTICIPANT), "participant");
  assert.equal(cairaPersona(Role.SUPERVISOR), "supervisor");
  assert.equal(cairaPersona(Role.ADMIN), "supervisor");
  assert.equal(cairaPersona(Role.SUPERADMIN), "supervisor");
});

test("cairaPersona: unknown/null defaults to worker", () => {
  assert.equal(cairaPersona(null), "worker");
  assert.equal(cairaPersona(undefined), "worker");
  assert.equal(cairaPersona("MYSTERY_ROLE"), "worker");
});

test("webAccessAllowedForRole: participants are NEVER allowed web access", () => {
  assert.equal(webAccessAllowedForRole(Role.PARTICIPANT), false);
});

test("webAccessAllowedForRole: staff roles are allowed (subject to the per-user grant)", () => {
  for (const role of [Role.WORKER, Role.SOLO_WORKER, Role.SUPERVISOR, Role.ADMIN, Role.SUPERADMIN]) {
    assert.equal(webAccessAllowedForRole(role), true, `expected ${role} allowed`);
  }
});

test("canManageWebAccess: only admin/superadmin/supervisor may grant", () => {
  assert.equal(canManageWebAccess(Role.ADMIN), true);
  assert.equal(canManageWebAccess(Role.SUPERADMIN), true);
  assert.equal(canManageWebAccess(Role.SUPERVISOR), true);
  assert.equal(canManageWebAccess(Role.WORKER), false);
  assert.equal(canManageWebAccess(Role.SOLO_WORKER), false);
  assert.equal(canManageWebAccess(Role.PARTICIPANT), false);
  assert.equal(canManageWebAccess(null), false);
});
