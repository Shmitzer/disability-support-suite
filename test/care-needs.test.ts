// Unit tests for the participant care-profile mapping (src/lib/care-needs.ts) — the
// pure resolution that decides which chips a participant sees. Phase 1 is behaviour-
// neutral (every current category is alwaysOn), so the real coverage here is the
// resolution logic itself, exercised with both the live catalogue and a synthetic one.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SupportNeed,
  suggestNeeds,
  visibleCategoryKeys,
  isNeedGroupVisible,
  type CareProfile,
} from "../src/lib/care-needs";
import { LOG_CATEGORIES, type LogCategory, type DetailGroup } from "../src/lib/log-categories";

test("suggestNeeds: condition tags map to a deduped union of flags", () => {
  const needs = suggestNeeds(["Cerebral palsy"]);
  assert.ok(needs.includes(SupportNeed.MobilityTransfer));
  assert.ok(needs.includes(SupportNeed.Dysphagia));
  assert.ok(needs.includes(SupportNeed.PressureCare));

  // Union + dedup across multiple conditions.
  const combined = suggestNeeds(["Epilepsy", "Acquired brain injury"]);
  assert.equal(combined.filter((n) => n === SupportNeed.Seizures).length, 1); // deduped
  assert.ok(combined.includes(SupportNeed.Seizures));

  assert.deepEqual(suggestNeeds([]), []);
  assert.deepEqual(suggestNeeds(["Not a condition"]), []);
});

test("every category is either alwaysOn or need-gated (no orphans)", () => {
  assert.ok(LOG_CATEGORIES.every((c) => c.alwaysOn || c.need));
});

test("visibleCategoryKeys: null profile (not configured) → ALL categories", () => {
  assert.deepEqual(
    visibleCategoryKeys(null),
    LOG_CATEGORIES.map((c) => c.key),
  );
});

test("visibleCategoryKeys: configured profile with no needs → only alwaysOn (universal) chips", () => {
  const profile: CareProfile = { conditions: [], supportNeeds: [] };
  assert.deepEqual(
    visibleCategoryKeys(profile),
    LOG_CATEGORIES.filter((c) => c.alwaysOn).map((c) => c.key),
  );
  // The need-gated tiles are hidden until their flag is set.
  for (const k of ["Behaviour", "Seizure", "Repositioning"]) {
    assert.ok(!visibleCategoryKeys(profile).includes(k), `${k} should be hidden`);
  }
});

test("visibleCategoryKeys: a need flag reveals its gated category (live catalogue)", () => {
  const seized = visibleCategoryKeys({ conditions: [], supportNeeds: [SupportNeed.Seizures] });
  assert.ok(seized.includes("Seizure"));
  assert.ok(!seized.includes("Behaviour")); // unrelated flag stays hidden
});

test("visibleCategoryKeys: need-gated categories appear only when the flag is set", () => {
  // Synthetic catalogue: one universal + one need-gated category.
  const synthetic: LogCategory[] = [
    { key: "Food", label: "Food", emoji: "🍽️", alwaysOn: true },
    { key: "Seizure", label: "Seizure", emoji: "⚡", need: SupportNeed.Seizures },
  ];
  // No flag → only the universal one.
  assert.deepEqual(
    visibleCategoryKeys({ conditions: [], supportNeeds: [] }, synthetic),
    ["Food"],
  );
  // Flag set → both.
  assert.deepEqual(
    visibleCategoryKeys({ conditions: [], supportNeeds: [SupportNeed.Seizures] }, synthetic),
    ["Food", "Seizure"],
  );
  // Null profile → everything (legacy all-on), even need-gated.
  assert.deepEqual(visibleCategoryKeys(null, synthetic), ["Food", "Seizure"]);
});

test("isNeedGroupVisible: needWhen gates on the profile flag", () => {
  const plain: DetailGroup = { key: "x", label: "x", mode: "single", options: ["a"] };
  const gated: DetailGroup = {
    key: "iddsi",
    label: "IDDSI level",
    mode: "single",
    options: ["0", "1"],
    needWhen: SupportNeed.Dysphagia,
  };
  // No needWhen → always visible.
  assert.equal(isNeedGroupVisible(plain, { conditions: [], supportNeeds: [] }), true);
  // Gated + flag absent → hidden.
  assert.equal(isNeedGroupVisible(gated, { conditions: [], supportNeeds: [] }), false);
  // Gated + flag present → visible.
  assert.equal(
    isNeedGroupVisible(gated, { conditions: [], supportNeeds: [SupportNeed.Dysphagia] }),
    true,
  );
  // Null profile → visible (legacy all-on).
  assert.equal(isNeedGroupVisible(gated, null), true);
});
