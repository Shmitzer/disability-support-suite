// Game engine — adaptive difficulty + tier selection.
//
// Pure logic, no DB and no React: deterministic and unit-testable. Every System A
// game reuses this so "adapts automatically, can be pinned by a worker" behaves the
// same everywhere. Reference game using it end-to-end: Word Match (word-match).

import type { AccessibilityProfile, Difficulty, GameDef, Tier } from "./types";
import { TIERS } from "./types";

// Where in a game's range a session should start, honouring a worker's pin and the
// game's own floor. Never returns a tier outside the game's declared range.
export function resolveStartTier(game: GameDef, profile: AccessibilityProfile): Tier {
  if (game.range.length === 0) return "T1";
  const pinned = profile.pinnedTier;
  if (pinned && game.range.includes(pinned)) return pinned;
  // No pin → start at the game's floor (most accessible entry point).
  return game.range[0];
}

// Map a tier to the coarse difficulty bucket stored on GameSession.
export function tierToDifficulty(game: GameDef, tier: Tier): Difficulty {
  const idx = game.range.indexOf(tier);
  if (idx <= 0) return "easy";
  if (idx >= game.range.length - 1) return "challenge";
  return "medium";
}

// Rolling-accuracy adaptive controller. Games feed it correct/incorrect outcomes;
// it nudges the tier up or down WITHIN the game's range. Non-punitive by design:
// it never drops below the floor and never jumps more than one tier at a time.
export interface AdaptiveState {
  tier: Tier;
  window: boolean[]; // recent outcomes, true = correct
}

const WINDOW_SIZE = 6;
const STEP_UP_AT = 0.85; // accuracy over the window to move up a tier
const STEP_DOWN_AT = 0.4; // accuracy over the window to ease down a tier

export function initAdaptive(game: GameDef, profile: AccessibilityProfile): AdaptiveState {
  return { tier: resolveStartTier(game, profile), window: [] };
}

// Record one outcome and return the (possibly changed) state. A worker pin freezes
// adaptation — the participant stays where the worker set them.
export function recordOutcome(
  state: AdaptiveState,
  game: GameDef,
  profile: AccessibilityProfile,
  correct: boolean,
): AdaptiveState {
  const window = [...state.window, correct].slice(-WINDOW_SIZE);
  if (profile.pinnedTier && game.range.includes(profile.pinnedTier)) {
    return { tier: profile.pinnedTier, window };
  }
  // Need a full window before moving, so a single slip never bumps difficulty.
  if (window.length < WINDOW_SIZE) return { ...state, window };

  const accuracy = window.filter(Boolean).length / window.length;
  const idx = game.range.indexOf(state.tier);
  let nextIdx = idx;
  if (accuracy >= STEP_UP_AT && idx < game.range.length - 1) nextIdx = idx + 1;
  else if (accuracy <= STEP_DOWN_AT && idx > 0) nextIdx = idx - 1;

  // Reset the window after a move so the new tier gets a fresh assessment.
  if (nextIdx !== idx) return { tier: game.range[nextIdx], window: [] };
  return { tier: state.tier, window };
}

// XP for a completed session. Scored games reward proportional accuracy on top of a
// completion base; sensory/no-score games reward engagement (completion) only. Tier
// gives a gentle multiplier so harder work earns a little more — never punitive.
export function computeXp(
  game: GameDef,
  opts: { completed: boolean; score: number; maxScore: number; tier: Tier },
): number {
  if (!opts.completed) return 0;
  const base = 10;
  const tierMultiplier = 1 + 0.15 * TIERS.indexOf(opts.tier); // T1=1.0 … T5=1.6
  if (!game.scored || opts.maxScore <= 0) {
    // Engagement-only games: flat participation XP.
    return Math.round(base * tierMultiplier);
  }
  const accuracy = Math.max(0, Math.min(1, opts.score / opts.maxScore));
  return Math.round(base * tierMultiplier * (0.5 + 0.5 * accuracy));
}
