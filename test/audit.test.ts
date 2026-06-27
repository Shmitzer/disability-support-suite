// Unit tests for the tamper-evident audit hash chain (src/lib/audit.ts). These
// exercise the PURE chain logic (no DB): canonicalisation determinism, the chain
// step, and verifyChain catching edits / deletions / reordering. This is the
// property that can't be cleanly retrofitted, so pin it hard.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicaliseAudit,
  chainHash,
  verifyChain,
  type AuditPayload,
  type AuditChainRow,
} from "../src/lib/audit";

function payload(over: Partial<AuditPayload> = {}): AuditPayload {
  return {
    action: "REPORT_APPROVED",
    actorId: "wkr_1",
    organisationId: "org_a",
    targetType: "ShiftReport",
    targetId: "rep_1",
    detail: { shiftId: "shf_1" },
    createdAt: "2026-06-24T10:00:00.000Z",
    ...over,
  };
}

// Build a valid chain from payloads, exactly as recordAudit would.
function buildChain(payloads: AuditPayload[]): AuditChainRow[] {
  const rows: AuditChainRow[] = [];
  let prev: string | null = null;
  for (const p of payloads) {
    const hash = chainHash(prev, p);
    rows.push({ ...p, prevHash: prev, hash });
    prev = hash;
  }
  return rows;
}

test("canonicaliseAudit: stable regardless of detail key order", () => {
  const a = canonicaliseAudit(payload({ detail: { a: 1, b: 2 } }));
  const b = canonicaliseAudit(payload({ detail: { b: 2, a: 1 } }));
  assert.equal(a, b);
});

test("chainHash: deterministic and sensitive to prevHash + payload", () => {
  const p = payload();
  assert.equal(chainHash(null, p), chainHash(null, p)); // deterministic
  assert.notEqual(chainHash(null, p), chainHash("abc", p)); // links to predecessor
  assert.notEqual(chainHash(null, p), chainHash(null, payload({ targetId: "rep_2" })));
});

test("verifyChain: a well-formed chain verifies", () => {
  const rows = buildChain([payload(), payload({ targetId: "rep_2" }), payload({ targetId: "rep_3" })]);
  assert.deepEqual(verifyChain(rows), { ok: true, brokenAt: null });
});

test("verifyChain: editing a row's payload is detected at that row", () => {
  const rows = buildChain([payload(), payload({ targetId: "rep_2" }), payload({ targetId: "rep_3" })]);
  // Tamper: change the middle row's detail but keep its stored hash.
  rows[1] = { ...rows[1], detail: { shiftId: "HACKED" } };
  const res = verifyChain(rows);
  assert.equal(res.ok, false);
  assert.equal(res.brokenAt, 1);
});

test("verifyChain: deleting a row breaks the link at the gap", () => {
  const rows = buildChain([payload(), payload({ targetId: "rep_2" }), payload({ targetId: "rep_3" })]);
  const without = [rows[0], rows[2]]; // drop the middle row
  const res = verifyChain(without);
  assert.equal(res.ok, false);
  assert.equal(res.brokenAt, 1); // row[2]'s prevHash no longer matches row[0]
});

test("verifyChain: reordering rows is detected", () => {
  const rows = buildChain([payload(), payload({ targetId: "rep_2" }), payload({ targetId: "rep_3" })]);
  const swapped = [rows[1], rows[0], rows[2]];
  assert.equal(verifyChain(swapped).ok, false);
});

test("verifyChain: empty chain is trivially valid", () => {
  assert.deepEqual(verifyChain([]), { ok: true, brokenAt: null });
});
