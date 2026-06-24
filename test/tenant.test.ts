// Unit tests for the multi-tenant helpers (src/lib/tenant.ts). These are the
// app-layer isolation primitive (Prisma bypasses RLS — Option A), so pin the
// behaviour: org members scope to their org; solo workers scope to their own uid.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { tenantOwner, tenantScope } from "../src/lib/tenant";

const orgWorker = { id: "wkr_1", supabaseUserId: "uid-1", organisationId: "org_a" };
const soloWithAuth = { id: "wkr_2", supabaseUserId: "uid-2", organisationId: null };
const soloPreAuth = { id: "wkr_3", supabaseUserId: null, organisationId: null };

test("tenantScope: org member scopes to their organisation", () => {
  assert.deepEqual(tenantScope(orgWorker), { organisationId: "org_a" });
});

test("tenantScope: solo worker scopes to their auth uid", () => {
  assert.deepEqual(tenantScope(soloWithAuth), { userId: "uid-2" });
});

test("tenantScope: solo pre-auth worker falls back to worker id", () => {
  assert.deepEqual(tenantScope(soloPreAuth), { userId: "wkr_3" });
});

test("tenantOwner: stamps userId (auth uid, else worker id) + organisationId", () => {
  assert.deepEqual(tenantOwner(orgWorker), { userId: "uid-1", organisationId: "org_a" });
  assert.deepEqual(tenantOwner(soloPreAuth), { userId: "wkr_3", organisationId: null });
});
