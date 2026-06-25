// Unit tests for the game engine's pure logic (src/lib/games/engine.ts) and the
// catalogue's integrity (src/lib/games/catalogue.ts). No DB — fast and deterministic.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, CATALOGUE_BY_SLUG, getGame, isKnownSlug } from "../src/lib/games/catalogue";
import {
  computeXp,
  initAdaptive,
  recordOutcome,
  resolveStartTier,
  tierToDifficulty,
} from "../src/lib/games/engine";
import { DEFAULT_PROFILE, TIERS, type AccessibilityProfile, type GameDef } from "../src/lib/games/types";

// ---- Catalogue integrity ------------------------------------------------------

test("catalogue holds exactly 100 games", () => {
  assert.equal(CATALOGUE.length, 100);
});

test("catalogue numbers are 1..100 with no gaps or dupes", () => {
  const nums = CATALOGUE.map((g) => g.num).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: 100 }, (_, i) => i + 1));
});

test("slugs are unique and resolvable", () => {
  const slugs = new Set(CATALOGUE.map((g) => g.slug));
  assert.equal(slugs.size, 100);
  assert.equal(Object.keys(CATALOGUE_BY_SLUG).length, 100);
  assert.ok(isKnownSlug("word-match"));
  assert.ok(!isKnownSlug("not-a-game"));
});

test("every game has a non-empty tier range drawn from the tier spine", () => {
  for (const g of CATALOGUE) {
    assert.ok(g.range.length > 0, `${g.slug} has empty range`);
    for (const t of g.range) assert.ok(TIERS.includes(t), `${g.slug} bad tier ${t}`);
    // Range must be contiguous and ascending (e.g. T2,T3,T4 — never T2,T4).
    const idxs = g.range.map((t) => TIERS.indexOf(t));
    for (let i = 1; i < idxs.length; i++) {
      assert.equal(idxs[i], idxs[i - 1] + 1, `${g.slug} range not contiguous`);
    }
  }
});

test("the five originally-specced games are present and flagged", () => {
  const existing = CATALOGUE.filter((g) => g.existing).map((g) => g.slug).sort();
  assert.deepEqual(existing, ["emotion-match", "number-sense", "sequence-it", "type-it", "word-match"]);
});

// ---- Tier resolution ----------------------------------------------------------

test("start tier defaults to the game's floor", () => {
  const pairs = getGame("pairs-pals")!; // range T2..T4
  assert.equal(resolveStartTier(pairs, DEFAULT_PROFILE), "T2");
});

test("a worker pin within range overrides the floor; out-of-range pin is ignored", () => {
  const pairs = getGame("pairs-pals")!; // T2..T4
  const pinnedT4: AccessibilityProfile = { ...DEFAULT_PROFILE, pinnedTier: "T4" };
  assert.equal(resolveStartTier(pairs, pinnedT4), "T4");
  const pinnedT1: AccessibilityProfile = { ...DEFAULT_PROFILE, pinnedTier: "T1" };
  assert.equal(resolveStartTier(pairs, pinnedT1), "T2"); // T1 not in range → floor
});

test("tierToDifficulty buckets floor/middle/ceiling", () => {
  const span = getGame("pattern-path")!; // T2..T5
  assert.equal(tierToDifficulty(span, "T2"), "easy");
  assert.equal(tierToDifficulty(span, "T3"), "medium");
  assert.equal(tierToDifficulty(span, "T5"), "challenge");
});

// ---- Adaptive controller ------------------------------------------------------

test("sustained success steps the tier up within range", () => {
  const game = getGame("pairs-pals")!; // T2..T4
  let s = initAdaptive(game, DEFAULT_PROFILE);
  assert.equal(s.tier, "T2");
  for (let i = 0; i < 6; i++) s = recordOutcome(s, game, DEFAULT_PROFILE, true);
  assert.equal(s.tier, "T3"); // moved up one, window reset
});

test("a single slip never bumps difficulty", () => {
  const game = getGame("pairs-pals")!;
  let s = initAdaptive(game, DEFAULT_PROFILE);
  s = recordOutcome(s, game, DEFAULT_PROFILE, false);
  assert.equal(s.tier, "T2");
});

test("sustained struggle eases down but never below the floor", () => {
  const game = getGame("pairs-pals")!; // floor T2
  let s = initAdaptive(game, DEFAULT_PROFILE);
  for (let i = 0; i < 12; i++) s = recordOutcome(s, game, DEFAULT_PROFILE, false);
  assert.equal(s.tier, "T2"); // already at floor, can't go lower
});

test("a worker pin freezes adaptation", () => {
  const game = getGame("pairs-pals")!;
  const pinned: AccessibilityProfile = { ...DEFAULT_PROFILE, pinnedTier: "T3" };
  let s = initAdaptive(game, pinned);
  for (let i = 0; i < 6; i++) s = recordOutcome(s, game, pinned, true);
  assert.equal(s.tier, "T3");
});

// ---- XP -----------------------------------------------------------------------

test("an incomplete session earns no XP", () => {
  const game = getGame("word-match")!;
  assert.equal(computeXp(game, { completed: false, score: 5, maxScore: 5, tier: "T2" }), 0);
});

test("scored XP scales with accuracy", () => {
  const game = getGame("word-match")!;
  const low = computeXp(game, { completed: true, score: 0, maxScore: 10, tier: "T2" });
  const high = computeXp(game, { completed: true, score: 10, maxScore: 10, tier: "T2" });
  assert.ok(high > low);
});

test("sensory no-score games earn flat participation XP", () => {
  const sensory = getGame("touch-bloom")! as GameDef;
  assert.equal(sensory.scored, false);
  const xp = computeXp(sensory, { completed: true, score: 0, maxScore: 0, tier: "T1" });
  assert.ok(xp > 0);
});

test("higher tiers earn a gentle multiplier", () => {
  const game = getGame("type-it")!; // spans T2..T5
  const t2 = computeXp(game, { completed: true, score: 10, maxScore: 10, tier: "T2" });
  const t5 = computeXp(game, { completed: true, score: 10, maxScore: 10, tier: "T5" });
  assert.ok(t5 > t2);
});
