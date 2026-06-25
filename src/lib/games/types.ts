// Game engine — shared types.
//
// System A only: single-player, therapeutic, contributes to NDIS goal progress.
// See docs/GAME_SUITE_SINGLEPLAYER_100.md for the full catalogue and design.

// The difficulty-tier spine — the "appeal to all" model. A game declares the band
// it spans; the adaptive controller moves a participant within that band.
export type Tier = "T1" | "T2" | "T3" | "T4" | "T5";

export const TIERS: Tier[] = ["T1", "T2", "T3", "T4", "T5"];

// Human labels for the tiers (used by the launcher and worker tools).
export const TIER_LABELS: Record<Tier, string> = {
  T1: "Sensory / cause-and-effect",
  T2: "Emerging",
  T3: "Developing",
  T4: "Capable",
  T5: "Expert",
};

// NDIS goal categories a game can feed. Mirrors NDISGoal.category strings.
export type NdisCategory =
  | "communication"
  | "numeracy"
  | "daily_living"
  | "social_participation"
  | "independence"
  | "fine_motor"
  | "health_wellbeing"
  | "learning"
  | "other";

// The three coarse difficulty buckets a session can run at (stored on GameSession).
export type Difficulty = "easy" | "medium" | "challenge";

// Every input mode maps to ONE unified event so games never branch on input type.
// This is what makes a single game body work for switch, gaze, touch and keyboard.
export type InputMode = "switch" | "gaze" | "touch" | "keyboard" | "pointer";

// A participant's saved accessibility profile — auto-configures every game on launch.
export interface AccessibilityProfile {
  inputMode: InputMode;
  scanDwellMs: number; // switch/gaze dwell before commit
  highContrast: boolean;
  reducedMotion: boolean;
  textScale: number; // 1.0 = default
  audioCues: boolean;
  captions: boolean;
  voiceOver: boolean; // narrate instructions
  haptics: boolean;
  noTimePressure: boolean; // true = timers always off (default true)
  dyslexiaFont: boolean;
  colourBlindSafe: boolean;
  aacBoardId: string | null; // participant's AAC board, if any
  // Complexity floor/ceiling the worker has pinned, within the game's own range.
  pinnedTier: Tier | null;
}

// Sensible defaults — the most accessible posture. A real profile overrides these.
export const DEFAULT_PROFILE: AccessibilityProfile = {
  inputMode: "touch",
  scanDwellMs: 800,
  highContrast: false,
  reducedMotion: false,
  textScale: 1,
  audioCues: true,
  captions: true,
  voiceOver: false,
  haptics: true,
  noTimePressure: true,
  dyslexiaFont: false,
  colourBlindSafe: false,
  aacBoardId: null,
  pinnedTier: null,
};

// A unified input event — what game bodies actually consume.
export interface GameInput {
  mode: InputMode;
  // Normalised position (0..1) for spatial games; null for abstract selections.
  x: number | null;
  y: number | null;
  // The selection index/id for choice games (e.g. which option was scanned to).
  selectionId: string | null;
}

// Static catalogue metadata for one game.
export interface GameDef {
  slug: string;
  num: number; // 1..100, catalogue order
  name: string;
  group: string; // catalogue group, e.g. "Sensory & cause-and-effect"
  description: string;
  target: string; // therapeutic target, one line
  categories: NdisCategory[]; // NDIS categories this game feeds
  range: Tier[]; // tiers the game spans (e.g. ["T2","T3","T4"])
  // No-score sensory games log engagement, not correctness (score/maxScore stay 0).
  scored: boolean;
  buildWave: 1 | 2 | 3 | 4 | 5;
  existing?: boolean; // part of the originally-specced five
}

// The outcome a game body reports when a session ends — fed to the recorder.
export interface SessionResult {
  participantId: string;
  gameSlug: string;
  tier: Tier;
  difficulty: Difficulty;
  score: number;
  maxScore: number;
  durationSecs: number;
  completed: boolean;
}
