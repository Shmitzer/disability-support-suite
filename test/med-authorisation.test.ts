// med-authorisation.test.ts — the hard-gated authorisation state machine
// (docs/MED_VERIFICATION_SPEC.md §2). Proves the gates can't be skipped: a record
// must walk DRAFT → PENDING_BSP → PENDING_COMMISSION → PENDING_GUARDIAN → ACTIVE one
// step at a time, may be DECLINED from any live stage, and is locked once DECLINED.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MED_AUTH_STATUSES,
  allowedTransitions,
  canTransition,
  nextStage,
  isActionable,
  isTerminal,
  isMedAuthStatus,
  type MedAuthStatus,
} from "../src/lib/med-authorisation";

const CHAIN: MedAuthStatus[] = [
  "DRAFT",
  "PENDING_BSP",
  "PENDING_COMMISSION",
  "PENDING_GUARDIAN",
  "ACTIVE",
];

test("forward progression is exactly one step at a time", () => {
  for (let i = 0; i < CHAIN.length - 1; i++) {
    assert.equal(nextStage(CHAIN[i]), CHAIN[i + 1]);
    assert.ok(canTransition(CHAIN[i], CHAIN[i + 1]), `${CHAIN[i]} → ${CHAIN[i + 1]}`);
  }
});

test("gates cannot be skipped (no jumping ahead)", () => {
  // From DRAFT, the ONLY forward target is PENDING_BSP — not COMMISSION/GUARDIAN/ACTIVE.
  for (const target of ["PENDING_COMMISSION", "PENDING_GUARDIAN", "ACTIVE"] as MedAuthStatus[]) {
    assert.equal(canTransition("DRAFT", target), false, `DRAFT must not skip to ${target}`);
  }
  // Every non-adjacent forward pair is illegal.
  for (let i = 0; i < CHAIN.length; i++) {
    for (let j = i + 2; j < CHAIN.length; j++) {
      assert.equal(canTransition(CHAIN[i], CHAIN[j]), false, `${CHAIN[i]} must not skip to ${CHAIN[j]}`);
    }
  }
});

test("no going backwards", () => {
  for (let i = 0; i < CHAIN.length; i++) {
    for (let j = 0; j < i; j++) {
      assert.equal(canTransition(CHAIN[i], CHAIN[j]), false, `${CHAIN[i]} must not revert to ${CHAIN[j]}`);
    }
  }
});

test("any live stage can be DECLINED", () => {
  for (const s of CHAIN) {
    assert.ok(canTransition(s, "DECLINED"), `${s} → DECLINED`);
    assert.ok(allowedTransitions(s).includes("DECLINED"));
  }
});

test("DECLINED is terminal and locked", () => {
  assert.ok(isTerminal("DECLINED"));
  assert.deepEqual(allowedTransitions("DECLINED"), []);
  for (const s of MED_AUTH_STATUSES) {
    if (s === "DECLINED") continue;
    assert.equal(canTransition("DECLINED", s), false, `DECLINED must not move to ${s}`);
  }
});

test("a no-op (same status) is always allowed; ACTIVE has no forward step", () => {
  for (const s of MED_AUTH_STATUSES) assert.ok(canTransition(s, s), `${s} → ${s}`);
  assert.equal(nextStage("ACTIVE"), null);
});

test("only ACTIVE is actionable by workers", () => {
  for (const s of MED_AUTH_STATUSES) {
    assert.equal(isActionable(s), s === "ACTIVE", `${s} actionable?`);
  }
});

test("isMedAuthStatus guards unknown values", () => {
  assert.ok(isMedAuthStatus("ACTIVE"));
  assert.equal(isMedAuthStatus("LIVE"), false);
  assert.equal(isMedAuthStatus(""), false);
});
