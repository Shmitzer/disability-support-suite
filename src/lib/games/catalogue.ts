// Game catalogue — the canonical registry of all 100 System A games.
// Source of truth in prose: docs/GAME_SUITE_SINGLEPLAYER_100.md.
// Keep slugs stable: they are written to GameSession.gameSlug / GoalGameLink.gameSlug.

import type { GameDef, Tier } from "./types";

// Compact tuple form keeps the table readable; expanded into GameDef below.
// [num, slug, name, description, target, categories, range, scored, wave, existing?]
type Row = [
  number,
  string,
  string,
  string,
  string,
  GameDef["categories"],
  Tier[],
  boolean,
  GameDef["buildWave"],
  boolean?,
];

const GROUPS: { group: string; rows: Row[] }[] = [
  {
    group: "Sensory & cause-and-effect",
    rows: [
      [1, "touch-bloom", "Touch & Bloom", "Any input blooms light/colour from that spot.", "Cause & effect, agency", ["health_wellbeing"], ["T1"], false, 1],
      [2, "switch-sparkle", "Switch Sparkle", "One switch press triggers fireworks, chimes, haptics.", "Switch cause & effect", ["health_wellbeing"], ["T1"], false, 2],
      [3, "gaze-garden", "Gaze Garden", "Flowers grow where your eyes rest.", "Gaze control, agency", ["fine_motor"], ["T1", "T2"], false, 2],
      [4, "sound-shake", "Sound Shake", "Tap/move makes layered musical tones.", "Cause & effect, auditory", ["health_wellbeing"], ["T1"], false, 3],
      [5, "ripple-pool", "Ripple Pool", "Touch sends slow ripples and water sounds outward.", "Sensory regulation", ["health_wellbeing"], ["T1"], false, 3],
      [6, "light-chaser", "Light Chaser", "A glowing orb follows your finger or gaze.", "Visual tracking", ["fine_motor"], ["T1", "T2"], false, 2],
      [7, "wake-animal", "Wake the Animal", "One press gently wakes/animates a friendly creature.", "Anticipation, cause & effect", ["learning"], ["T1", "T2"], false, 3],
      [8, "cause-caira", "Cause & Caira", "Any input makes Caira react — wave, smile, giggle.", "Engagement, agency", ["social_participation"], ["T1", "T2"], false, 1],
      [9, "rumble-rain", "Rumble Rain", "Switch starts soothing rain with synced haptics.", "Calming, cause & effect", ["health_wellbeing"], ["T1"], false, 3],
      [10, "big-button", "My Big Button", "One huge target; pressing it always does something delightful.", "Errorless agency", ["health_wellbeing"], ["T1"], false, 2],
    ],
  },
  {
    group: "Foundational cognition",
    rows: [
      [11, "same-again", "Same Again", "Tap the picture that matches the model.", "Matching", ["learning"], ["T2"], true, 1],
      [12, "pop-match", "Pop the Match", "Pop only the items matching a shown target.", "Discrimination", ["learning"], ["T2", "T3"], true, 2],
      [13, "sort-bins", "Sort Bins", "Drag items into the right bin (colour/shape/type).", "Categorisation", ["learning"], ["T2", "T3"], true, 2],
      [14, "peekaboo", "Peekaboo", "Object hides; predict where it reappears.", "Object permanence", ["learning"], ["T1", "T2"], true, 3],
      [15, "big-small", "Big or Small", "Pick the bigger/smaller of two.", "Comparison", ["numeracy"], ["T2"], true, 3],
      [16, "odd-one-out", "Odd One Out", "Find the item that doesn't belong.", "Discrimination, reasoning", ["learning"], ["T2", "T3", "T4"], true, 2],
      [17, "finish-pattern", "Finish the Pattern", "Continue colour/shape/sound sequences.", "Patterning", ["learning"], ["T2", "T3", "T4"], true, 2],
      [18, "cause-chains", "Cause Chains", "Trigger a domino/Rube-Goldberg reaction.", "Cause & effect, planning", ["learning"], ["T2", "T3"], true, 3],
      [19, "hide-seek", "Hide & Seek", "Find an object revealed by audio/visual hints.", "Attention, search", ["learning"], ["T2", "T3"], true, 3],
    ],
  },
  {
    group: "Literacy & language",
    rows: [
      [20, "word-match", "Word Match", "Match a word to its picture or meaning.", "Vocabulary, word-object association", ["communication", "learning"], ["T2", "T3"], true, 1, true],
      [21, "sound-starters", "Sound Starters", "Pick the picture that begins with a target sound.", "Phonics, initial sounds", ["communication"], ["T2"], true, 2],
      [22, "build-a-word", "Build-a-Word", "Drag letters/syllables to form a target word.", "Spelling, blending", ["communication"], ["T2", "T3", "T4"], true, 2],
      [23, "rhyme-time", "Rhyme Time", "Choose the word that rhymes with the prompt.", "Sound patterns", ["communication"], ["T2", "T3"], true, 3],
      [24, "sentence-builder", "Sentence Builder", "Arrange word cards into a simple sentence.", "Syntax", ["communication"], ["T3", "T4"], true, 2],
      [25, "story-steps", "Story Steps", "Order picture cards to retell a short story.", "Narrative, comprehension", ["communication"], ["T3", "T4"], true, 3],
      [26, "sight-word-garden", "Sight Word Garden", "Recognise high-frequency words to grow a garden.", "Sight-word fluency", ["learning"], ["T2", "T3"], true, 3],
      [27, "word-roots", "Word Roots", "Build words from prefixes/roots/suffixes.", "Morphology", ["learning"], ["T4", "T5"], true, 4],
      [28, "cryptogram", "Cryptogram", "Decode a quote by cracking the letter cipher.", "Reasoning, vocabulary", ["learning"], ["T4", "T5"], true, 4],
    ],
  },
  {
    group: "Numeracy & mathematics",
    rows: [
      [29, "number-sense", "Number Sense", "Compare and order quantities and numerals.", "Number magnitude", ["numeracy"], ["T2", "T3"], true, 1, true],
      [30, "count-along", "Count Along", "Count objects and select the matching number.", "One-to-one counting", ["numeracy"], ["T2"], true, 2],
      [31, "coin-cafe", "Coin Café", "Pay for items using virtual coins/notes.", "Money handling", ["numeracy"], ["T3", "T4"], true, 3],
      [32, "clock-keeper", "Clock Keeper", "Match analogue and digital times to activities.", "Time-telling", ["numeracy"], ["T3"], true, 3],
      [33, "add-take", "Add & Take", "Solve simple add/subtract with visual supports.", "Arithmetic", ["numeracy"], ["T3", "T4"], true, 2],
      [34, "times-towers", "Times Table Towers", "Build towers by mastering multiplication facts.", "Multiplication", ["numeracy"], ["T3", "T4"], true, 4],
      [35, "fraction-pizza", "Fraction Pizza", "Split, compare, and combine fractions visually.", "Fractions", ["numeracy"], ["T4"], true, 4],
      [36, "math-sprint", "Mental Math Sprint", "Optional timed arithmetic ladders (off by default).", "Fluency, speed", ["numeracy"], ["T4", "T5"], true, 4],
      [37, "logic-numbers", "Logic Numbers", "Sudoku / KenKen-style number logic with assist tiers.", "Number logic", ["learning"], ["T4", "T5"], true, 4],
      [38, "pattern-path", "Pattern Path", "Continue a number or shape pattern, extending to algebra.", "Patterning, algebra", ["numeracy"], ["T2", "T3", "T4", "T5"], true, 2],
    ],
  },
  {
    group: "Memory & recall",
    rows: [
      [39, "pairs-pals", "Pairs & Pals", "Flip-and-match memory with Caira characters.", "Visual working memory", ["learning"], ["T2", "T3", "T4"], true, 1],
      [40, "whats-missing", "What's Missing?", "Spot the item removed from a small set.", "Visual recall", ["learning"], ["T2", "T3"], true, 2],
      [41, "sound-memory", "Sound Memory", "Repeat a growing sequence of sounds.", "Auditory working memory", ["learning"], ["T2", "T3", "T4"], true, 2],
      [42, "where-was-it", "Where Was It?", "Remember where objects were hidden.", "Spatial memory", ["learning"], ["T2", "T3"], true, 3],
      [43, "daily-recall", "Daily Recall", "Recall steps of a familiar routine just shown.", "Episodic recall", ["independence"], ["T2", "T3"], true, 3],
      [44, "face-name", "Face & Name", "Match remembered faces to names.", "Social memory", ["social_participation"], ["T3", "T4"], true, 3],
      [45, "memory-palace", "Memory Palace", "Learn the loci technique; recall long lists/numbers.", "Mnemonic strategy", ["learning"], ["T4", "T5"], true, 4],
      [46, "digit-span", "Digit Span", "Recall growing number/word strings.", "Working-memory span", ["learning"], ["T3", "T4", "T5"], true, 3],
    ],
  },
  {
    group: "Attention & visual perception",
    rows: [
      [47, "find-target", "Find the Target", "Find a specific item among distractors.", "Selective attention", ["learning"], ["T2", "T3", "T4"], true, 2],
      [48, "stay-with-it", "Stay With It", "Watch for a signal in a calm stream.", "Sustained attention", ["learning"], ["T2", "T3"], true, 3],
      [49, "same-different", "Same or Different", "Decide if two items match.", "Discrimination", ["learning"], ["T2", "T3"], true, 2],
      [50, "shape-shadows", "Shape Shadows", "Match shapes to their outlines/shadows.", "Form constancy", ["learning"], ["T2", "T3"], true, 3],
      [51, "picture-pieces", "Picture Pieces", "Complete a picture from a few large pieces.", "Visual closure", ["learning"], ["T2", "T3"], true, 3],
      [52, "spot-difference", "Spot the Difference", "Find differences across scenes; scales hard.", "Visual scanning", ["learning"], ["T3", "T4", "T5"], true, 3],
      [53, "hidden-objects", "Hidden Objects", "Locate items in a rich scene.", "Visual search", ["learning"], ["T3", "T4"], true, 4],
      [54, "mental-rotation", "Mental Rotation", "Decide if rotated 3D shapes match.", "Spatial reasoning", ["learning"], ["T4", "T5"], true, 4],
    ],
  },
  {
    group: "Logic, strategy & deep puzzles",
    rows: [
      [55, "switch-tracks", "Switch Tracks", "Follow a changing rule (e.g. colour then shape).", "Cognitive flexibility", ["learning"], ["T3", "T4"], true, 3],
      [56, "sort-it-out", "Sort It Out", "Group objects by category, then by hidden rule.", "Flexible thinking", ["learning"], ["T2", "T3", "T4"], true, 2],
      [57, "maze-minds", "Maze Minds", "Navigate mazes from huge-and-simple to fiendish.", "Planning, spatial", ["learning"], ["T2", "T3", "T4", "T5"], true, 3],
      [58, "tangram", "Tangram Tiles", "Fit shapes to fill silhouettes.", "Spatial reasoning", ["learning"], ["T3", "T4", "T5"], true, 4],
      [59, "chess-trainer", "Chess Trainer", "Full chess plus a puzzle ladder with assist/hint tiers.", "Strategy, planning", ["learning"], ["T3", "T4", "T5"], true, 4],
      [60, "go-gomoku", "Go / Gomoku", "Stone-placement strategy with tutorial scaffolding.", "Strategy", ["learning"], ["T4", "T5"], true, 5],
      [61, "logic-grid", "Logic Grid", "Deduce solutions from clues (Einstein-style).", "Deductive reasoning", ["learning"], ["T4", "T5"], true, 4],
      [62, "tower-builder", "Tower Builder", "Towers of Hanoi and planning puzzles.", "Planning, recursion", ["learning"], ["T3", "T4", "T5"], true, 4],
      [63, "code-breaker", "Code Breaker", "Mastermind-style deduction.", "Logical inference", ["learning"], ["T3", "T4", "T5"], true, 4],
      [64, "circuit-logic", "Circuit Logic", "Wire gentle logic-gate / flow puzzles (intro to coding).", "Computational thinking", ["learning"], ["T4", "T5"], true, 5],
    ],
  },
  {
    group: "Executive function — planning",
    rows: [
      [65, "sequence-it", "Sequence It", "Put steps of an activity in the right order.", "Sequencing", ["independence"], ["T2", "T3"], true, 1, true],
      [66, "plan-my-day", "Plan My Day", "Drag activities into a visual daily schedule.", "Planning", ["independence"], ["T3"], true, 3],
      [67, "first-then", "First–Then", "Choose what comes first and what comes next.", "Transitions", ["independence"], ["T2"], true, 2],
      [68, "goal-path", "Goal Path", "Break a goal into ordered small steps.", "Task analysis", ["independence"], ["T3", "T4"], true, 3],
      [69, "recipe-planner", "Recipe Planner", "Plan multi-step tasks with dependencies.", "Planning", ["daily_living"], ["T4"], true, 4],
      [70, "budget-buddy", "Budget Buddy", "Plan a simple budget across choices.", "Financial planning", ["independence"], ["T4", "T5"], true, 4],
      [71, "what-if", "What-If Choices", "Branching consequence-reasoning scenarios.", "Decision-making", ["independence"], ["T3", "T4", "T5"], true, 4],
    ],
  },
  {
    group: "Emotional literacy & social cognition",
    rows: [
      [72, "emotion-match", "Emotion Match", "Match faces or scenarios to emotion words.", "Emotion recognition", ["social_participation"], ["T2", "T3"], true, 1, true],
      [73, "how-feel", "How Would They Feel?", "Predict a character's feeling in a situation.", "Perspective-taking", ["social_participation"], ["T3", "T4"], true, 3],
      [74, "calm-or-big", "Calm or Big?", "Sort feelings by intensity (calm to big).", "Regulation awareness", ["health_wellbeing"], ["T2", "T3"], true, 3],
      [75, "feelings-checkin", "My Feelings Check-In", "Pick how you feel right now from a board.", "Self-awareness", ["health_wellbeing"], ["T1", "T2", "T3"], false, 2],
      [76, "what-could-help", "What Could Help?", "Choose a coping strategy for a feeling.", "Coping strategies", ["health_wellbeing"], ["T3"], true, 3],
      [77, "read-the-room", "Read the Room", "Interpret tone/body-language cues in a scene.", "Social cognition", ["social_participation"], ["T3", "T4", "T5"], true, 4],
      [78, "social-detective", "Social Detective", "Reason through subtle social scenarios.", "Social inference", ["social_participation"], ["T4", "T5"], true, 5],
    ],
  },
  {
    group: "Communication & AAC",
    rows: [
      [79, "tell-me-more", "Tell Me More", "Build a message from AAC symbols to a prompt.", "Expressive language", ["communication"], ["T2", "T3", "T4"], true, 2],
      [80, "choose-ask", "Choose & Ask", "Select symbols to 'ask' for an item (errorless).", "Requesting", ["communication"], ["T1", "T2"], false, 2],
      [81, "yes-no-quest", "Yes / No Quest", "Answer yes/no questions about pictures.", "Receptive language", ["communication"], ["T1", "T2"], true, 2],
      [82, "symbol-story", "Symbol Story", "Sequence AAC symbols into a short message.", "Symbol literacy", ["communication"], ["T2", "T3", "T4"], true, 3],
      [83, "word-predictor", "Word Predictor", "Practise fluent AAC sentence-building with prediction.", "Communication fluency", ["communication"], ["T3", "T4", "T5"], true, 4],
    ],
  },
  {
    group: "Fine-motor & coordination",
    rows: [
      [84, "type-it", "Type It", "Type target letters/words on screen.", "Typing, letter location, motor", ["fine_motor", "communication"], ["T2", "T3", "T4", "T5"], true, 1, true],
      [85, "trace-place", "Trace & Place", "Trace lines and shapes with finger/stylus.", "Pre-writing", ["fine_motor"], ["T1", "T2", "T3"], true, 2],
      [86, "pop-tap", "Pop & Tap", "Tap gentle targets as they appear.", "Targeting", ["fine_motor"], ["T1", "T2"], true, 2],
      [87, "drag-path", "Drag the Path", "Drag an object along a winding route.", "Sustained motor control", ["fine_motor"], ["T2", "T3"], true, 3],
      [88, "pinch-build", "Pinch & Build", "Drag/drop pieces to build a picture.", "Grasp-and-release", ["fine_motor"], ["T2", "T3"], true, 3],
      [89, "steady-hand", "Steady Hand", "Guide a line without touching the edges.", "Precision control", ["fine_motor"], ["T3", "T4", "T5"], true, 4],
    ],
  },
  {
    group: "Sensory regulation & calm",
    rows: [
      [90, "breathe-caira", "Breathe With Caira", "Follow a breathing guide animation.", "Breath regulation", ["health_wellbeing"], ["T1", "T2", "T3"], false, 1],
      [91, "calm-canvas", "Calm Canvas", "Make gentle fluid visuals with touch/gaze.", "Sensory soothing", ["health_wellbeing"], ["T1", "T2", "T3"], false, 2],
      [92, "sound-garden", "Sound Garden", "Build relaxing soundscapes from elements.", "Auditory regulation", ["health_wellbeing"], ["T1", "T2", "T3"], false, 3],
      [93, "bubble-calm", "Bubble Calm", "Pop slow-rising bubbles at your own pace.", "Down-regulation", ["health_wellbeing"], ["T1", "T2"], false, 2],
      [94, "glow-trace", "Glow Trace", "Follow a slow light with finger or gaze.", "Visual tracking, calm", ["health_wellbeing"], ["T1", "T2"], false, 3],
      [95, "zen-sand", "Zen Sand", "Rake a calm digital sand garden, no goal.", "Self-regulation", ["health_wellbeing"], ["T1", "T2", "T3"], false, 3],
    ],
  },
  {
    group: "Daily-living & independence",
    rows: [
      [96, "morning-routine", "Morning Routine", "Order and 'do' steps of getting ready.", "Routine independence", ["daily_living"], ["T2", "T3"], true, 3],
      [97, "shop-smart", "Shop Smart", "Build a shopping list and 'buy' items.", "Functional numeracy", ["daily_living"], ["T3", "T4"], true, 4],
      [98, "safe-crossing", "Safe Crossing", "Practise road-safety decisions in a scene.", "Community safety", ["independence"], ["T2", "T3"], true, 3],
      [99, "kitchen-steps", "Kitchen Steps", "Sequence a simple safe recipe.", "Cooking sequence", ["daily_living"], ["T3", "T4"], true, 4],
      [100, "ask-for-help", "Ask for Help", "Choose how/where to get help in a situation.", "Self-advocacy", ["independence"], ["T2", "T3"], true, 3],
    ],
  },
];

// Flattened, typed catalogue.
export const CATALOGUE: GameDef[] = GROUPS.flatMap(({ group, rows }) =>
  rows.map(
    ([num, slug, name, description, target, categories, range, scored, buildWave, existing]): GameDef => ({
      slug,
      num,
      name,
      group,
      description,
      target,
      categories,
      range,
      scored,
      buildWave,
      existing: existing ?? false,
    }),
  ),
);

// Fast lookup by slug.
export const CATALOGUE_BY_SLUG: Record<string, GameDef> = Object.fromEntries(
  CATALOGUE.map((g) => [g.slug, g]),
);

export function getGame(slug: string): GameDef | undefined {
  return CATALOGUE_BY_SLUG[slug];
}

// The set of slugs we treat as live in code. Anything written to GameSession must
// be a known slug — guards against typos and stale slugs reaching the database.
export function isKnownSlug(slug: string): boolean {
  return slug in CATALOGUE_BY_SLUG;
}
