# Caira Game Suite — 100 Single-Player Games

**Product backlog · System A only · single-player, therapeutic, NDIS-goal-linked.**

Multiplayer (old System B) is deliberately out of scope here. Every game in this
document is single-player, contributes to NDIS goal progress, is accessibility-first,
adaptive, offline-capable, and non-punitive.

The design problem this solves: the original 60-game System A list had a **low ceiling** —
every game was gentle/few-item/no-fail, right for the floor but boring for a high-ability
participant in seconds. A suite that genuinely "appeals to all" needs a real **floor**
(severe ABI, single-switch, no cognition assumed) *and* a real **ceiling** (genuine chess,
cryptography, advanced maths for highly intelligent / savant participants). Most games here
**span tiers** — the same title grows with the participant; the accessibility profile sets
the entry point. No separate "disabled version" of anything.

---

## Difficulty-tier spine (the "appeal to all" model)

| Tier | Who | Interaction | Cognition assumed |
|---|---|---|---|
| **T1** | Severe ABI / profound & multiple needs | Single switch, eye-gaze, any input | None — pure cause & effect |
| **T2** | Emerging | One-step choice, recognition, matching | Minimal |
| **T3** | Developing | Multi-step, light reasoning | Moderate |
| **T4** | Capable | Planning, strategy, abstraction | High |
| **T5** | Expert / savant ceiling | Real depth, open mastery | Very high |

A game's **Range** column shows the band it spans. Adaptive difficulty (System A) moves a
participant within their range automatically; a worker can also pin a level. Assist tiers
(hints, errorless mode, scaffolding) let a lower-ability participant *enter* a high-ceiling
game without changing the game.

## Accessibility baseline (all 100)

Switch (1- & 2-switch scanning), eye-gaze, touch, keyboard, pointer · screen-reader + audio
cues + captions · high-contrast / dyslexia / colour-blind themes · **no time pressure by
default** · **no shaming fail-states, no "game over"** · adjustable complexity/distractors ·
fully offline · AAC-friendly (symbol support, large targets, participant's own board) · one
saved accessibility profile auto-configures every game on first launch.

**Clinical framing:** games *support and practise* skills. They do not treat, cure, or
diagnose. No medical claims. No real participant data.

## NDIS goal categories (mapping target codes)

`communication` · `numeracy` · `daily_living` · `social_participation` · `independence` ·
`fine_motor` · `health_wellbeing` · `learning` · `other` — matches `NDISGoal.category` in
the schema. Each game below carries the code(s) it feeds.

---

## Catalogue at a glance

| Group | Games | Primary NDIS category |
|---|---|---|
| 1. Sensory & cause-and-effect | 10 | health_wellbeing / communication |
| 2. Foundational cognition | 9 | learning |
| 3. Literacy & language | 9 | communication / learning |
| 4. Numeracy & mathematics | 10 | numeracy |
| 5. Memory & recall | 8 | learning |
| 6. Attention & visual perception | 8 | learning |
| 7. Logic, strategy & deep puzzles | 10 | learning |
| 8. Executive function — planning | 7 | independence / learning |
| 9. Emotional literacy & social cognition | 7 | social_participation |
| 10. Communication & AAC | 5 | communication |
| 11. Fine-motor & coordination | 6 | fine_motor |
| 12. Sensory regulation & calm | 6 | health_wellbeing |
| 13. Daily-living & independence | 5 | daily_living / independence |
| **Total** | **100** | |

Legend: **B?** = build wave (see Build Plan). **Slug** = stable identifier for
`GameSession.gameSlug` / `GoalGameLink.gameSlug`.

---

## 1. Sensory & cause-and-effect (10) — *the floor*

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 1 | Touch & Bloom | `touch-bloom` | Any input blooms light/colour from that spot. | Cause & effect, agency | health_wellbeing | T1 | **1** |
| 2 | Switch Sparkle | `switch-sparkle` | One switch → fireworks, chimes, haptics. | Switch cause & effect | health_wellbeing | T1 | 2 |
| 3 | Gaze Garden | `gaze-garden` | Flowers grow where your eyes rest. | Gaze control, agency | fine_motor | T1–T2 | 2 |
| 4 | Sound Shake | `sound-shake` | Tap/move makes layered musical tones. | Cause & effect, auditory | health_wellbeing | T1 | 3 |
| 5 | Ripple Pool | `ripple-pool` | Touch sends slow ripples + water sound. | Sensory regulation | health_wellbeing | T1 | 3 |
| 6 | Light Chaser | `light-chaser` | A glowing orb follows finger/gaze. | Visual tracking | fine_motor | T1–T2 | 2 |
| 7 | Wake the Animal | `wake-animal` | One press gently animates a creature. | Anticipation, cause & effect | learning | T1–T2 | 3 |
| 8 | Cause & Caira | `cause-caira` | Any input makes Caira react warmly. | Engagement, agency | social_participation | T1–T2 | **1** |
| 9 | Rumble Rain | `rumble-rain` | Switch starts rain + synced haptics. | Calming, cause & effect | health_wellbeing | T1 | 3 |
| 10 | My Big Button | `big-button` | One huge target; always delightful. | Errorless agency | health_wellbeing | T1 | 2 |

## 2. Foundational cognition (9)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 11 | Same Again | `same-again` | Tap the picture matching the model. | Matching | learning | T2 | **1** |
| 12 | Pop the Match | `pop-match` | Pop only items matching the target. | Discrimination | learning | T2–T3 | 2 |
| 13 | Sort Bins | `sort-bins` | Drag items to the right bin. | Categorisation | learning | T2–T3 | 2 |
| 14 | Peekaboo | `peekaboo` | Predict where a hidden object reappears. | Object permanence | learning | T1–T2 | 3 |
| 15 | Big or Small | `big-small` | Pick the bigger/smaller. | Comparison | numeracy | T2 | 3 |
| 16 | Odd One Out | `odd-one-out` | Find what doesn't belong. | Discrimination, reasoning | learning | T2–T4 | 2 |
| 17 | Finish the Pattern | `finish-pattern` | Continue colour/shape/sound sequences. | Patterning | learning | T2–T4 | 2 |
| 18 | Cause Chains | `cause-chains` | Trigger a domino reaction. | Cause & effect, planning | learning | T2–T3 | 3 |
| 19 | Hide & Seek | `hide-seek` | Find an object from audio/visual hints. | Attention, search | learning | T2–T3 | 3 |

## 3. Literacy & language (9)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 20 | Word Match *(existing spec)* | `word-match` | Match word to picture/meaning. | Vocabulary | communication | T2–T3 | **1** |
| 21 | Sound Starters | `sound-starters` | Pick the picture starting with a sound. | Phonics | communication | T2 | 2 |
| 22 | Build-a-Word | `build-a-word` | Drag letters/syllables to spell. | Spelling, blending | communication | T2–T4 | 2 |
| 23 | Rhyme Time | `rhyme-time` | Choose the rhyming word. | Sound patterns | communication | T2–T3 | 3 |
| 24 | Sentence Builder | `sentence-builder` | Arrange word cards into a sentence. | Syntax | communication | T3–T4 | 2 |
| 25 | Story Steps | `story-steps` | Order picture cards to retell a story. | Narrative, comprehension | communication | T3–T4 | 3 |
| 26 | Sight Word Garden | `sight-word-garden` | Recognise sight words to grow a garden. | Sight-word fluency | learning | T2–T3 | 3 |
| 27 | Word Roots | `word-roots` | Build words from prefixes/roots/suffixes. | Morphology | learning | T4–T5 | 4 |
| 28 | Cryptogram | `cryptogram` | Decode a quote by cracking the cipher. | Reasoning, vocabulary | learning | T4–T5 | 4 |

## 4. Numeracy & mathematics (10)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 29 | Number Sense *(existing spec)* | `number-sense` | Compare/order quantities & numerals. | Magnitude | numeracy | T2–T3 | **1** |
| 30 | Count Along | `count-along` | Count objects, select the number. | One-to-one counting | numeracy | T2 | 2 |
| 31 | Coin Café | `coin-cafe` | Pay with virtual AU coins/notes. | Money handling | numeracy | T3–T4 | 3 |
| 32 | Clock Keeper | `clock-keeper` | Match analogue/digital times. | Time-telling | numeracy | T3 | 3 |
| 33 | Add & Take | `add-take` | Add/subtract with visual supports. | Arithmetic | numeracy | T3–T4 | 2 |
| 34 | Times Table Towers | `times-towers` | Build towers via multiplication facts. | Multiplication | numeracy | T3–T4 | 4 |
| 35 | Fraction Pizza | `fraction-pizza` | Split/compare/combine fractions. | Fractions | numeracy | T4 | 4 |
| 36 | Mental Math Sprint | `math-sprint` | Optional timed arithmetic ladders. | Fluency, speed | numeracy | T4–T5 | 4 |
| 37 | Logic Numbers | `logic-numbers` | Sudoku/KenKen with assist tiers. | Number logic | learning | T4–T5 | 4 |
| 38 | Pattern Path | `pattern-path` | Continue patterns → into algebra. | Patterning, algebra | numeracy | T2–T5 | 2 |

## 5. Memory & recall (8)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 39 | Pairs & Pals | `pairs-pals` | Flip-and-match, adjustable grid. | Visual memory | learning | T2–T4 | **1** |
| 40 | What's Missing? | `whats-missing` | Spot the removed item. | Visual recall | learning | T2–T3 | 2 |
| 41 | Sound Memory | `sound-memory` | Repeat a growing tone sequence. | Auditory memory | learning | T2–T4 | 2 |
| 42 | Where Was It? | `where-was-it` | Remember hidden object locations. | Spatial memory | learning | T2–T3 | 3 |
| 43 | Daily Recall | `daily-recall` | Recall steps of a routine just shown. | Episodic recall | independence | T2–T3 | 3 |
| 44 | Face & Name | `face-name` | Match faces to names. | Social memory | social_participation | T3–T4 | 3 |
| 45 | Memory Palace | `memory-palace` | Learn loci; recall long lists/numbers. | Mnemonic strategy | learning | T4–T5 | 4 |
| 46 | Digit Span | `digit-span` | Recall growing number/word strings. | Working-memory span | learning | T3–T5 | 3 |

## 6. Attention & visual perception (8)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 47 | Find the Target | `find-target` | Find an item among distractors. | Selective attention | learning | T2–T4 | 2 |
| 48 | Stay With It | `stay-with-it` | Watch for a signal in a calm stream. | Sustained attention | learning | T2–T3 | 3 |
| 49 | Same or Different | `same-different` | Decide if two items match. | Discrimination | learning | T2–T3 | 2 |
| 50 | Shape Shadows | `shape-shadows` | Match shapes to outlines. | Form constancy | learning | T2–T3 | 3 |
| 51 | Picture Pieces | `picture-pieces` | Complete a picture from large pieces. | Visual closure | learning | T2–T3 | 3 |
| 52 | Spot the Difference | `spot-difference` | Find differences; scales hard. | Visual scanning | learning | T3–T5 | 3 |
| 53 | Hidden Objects | `hidden-objects` | Locate items in a rich scene. | Visual search | learning | T3–T4 | 4 |
| 54 | Mental Rotation | `mental-rotation` | Match rotated 3D shapes. | Spatial reasoning | learning | T4–T5 | 4 |

## 7. Logic, strategy & deep puzzles (10) — *the ceiling*

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 55 | Switch Tracks | `switch-tracks` | Follow a changing rule (set-shifting). | Cognitive flexibility | learning | T3–T4 | 3 |
| 56 | Sort It Out | `sort-it-out` | Group by rule, then by hidden rule. | Flexible thinking | learning | T2–T4 | 2 |
| 57 | Maze Minds | `maze-minds` | Mazes from huge-simple to fiendish. | Planning, spatial | learning | T2–T5 | 3 |
| 58 | Tangram Tiles | `tangram` | Fit shapes to fill silhouettes. | Spatial reasoning | learning | T3–T5 | 4 |
| 59 | Chess Trainer | `chess-trainer` | Full chess + puzzle ladder + hints. | Strategy, planning | learning | T3–T5 | 4 |
| 60 | Go / Gomoku | `go-gomoku` | Stone strategy with scaffolding. | Strategy | learning | T4–T5 | 5 |
| 61 | Logic Grid | `logic-grid` | Deduce from clues (Einstein puzzles). | Deductive reasoning | learning | T4–T5 | 4 |
| 62 | Tower Builder | `tower-builder` | Towers of Hanoi & planning puzzles. | Planning, recursion | learning | T3–T5 | 4 |
| 63 | Code Breaker | `code-breaker` | Mastermind-style deduction. | Logical inference | learning | T3–T5 | 4 |
| 64 | Circuit Logic | `circuit-logic` | Gentle logic-gate / flow puzzles. | Computational thinking | learning | T4–T5 | 5 |

## 8. Executive function — planning (7)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 65 | Sequence It *(existing spec)* | `sequence-it` | Order steps of an activity. | Sequencing | independence | T2–T3 | **1** |
| 66 | Plan My Day | `plan-my-day` | Drag activities into a schedule. | Planning | independence | T3 | 3 |
| 67 | First–Then | `first-then` | Choose what comes first/next. | Transitions | independence | T2 | 2 |
| 68 | Goal Path | `goal-path` | Break a goal into ordered steps. | Task analysis | independence | T3–T4 | 3 |
| 69 | Recipe Planner | `recipe-planner` | Plan multi-step tasks with dependencies. | Planning | daily_living | T4 | 4 |
| 70 | Budget Buddy | `budget-buddy` | Plan a simple budget across choices. | Financial planning | independence | T4–T5 | 4 |
| 71 | What-If Choices | `what-if` | Branching consequence reasoning. | Decision-making | independence | T3–T5 | 4 |

## 9. Emotional literacy & social cognition (7)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 72 | Emotion Match *(existing spec)* | `emotion-match` | Match faces/scenarios to emotions. | Emotion recognition | social_participation | T2–T3 | **1** |
| 73 | How Would They Feel? | `how-feel` | Predict a character's feeling. | Perspective-taking | social_participation | T3–T4 | 3 |
| 74 | Calm or Big? | `calm-or-big` | Sort feelings by intensity. | Regulation awareness | health_wellbeing | T2–T3 | 3 |
| 75 | My Feelings Check-In | `feelings-checkin` | Pick how you feel (AAC board). | Self-awareness | health_wellbeing | T1–T3 | 2 |
| 76 | What Could Help? | `what-could-help` | Choose a coping strategy. | Coping strategies | health_wellbeing | T3 | 3 |
| 77 | Read the Room | `read-the-room` | Interpret tone/body-language cues. | Social cognition | social_participation | T3–T5 | 4 |
| 78 | Social Detective | `social-detective` | Reason through subtle scenarios. | Social inference | social_participation | T4–T5 | 5 |

## 10. Communication & AAC (5)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 79 | Tell Me More | `tell-me-more` | Build a message from AAC symbols. | Expressive language | communication | T2–T4 | 2 |
| 80 | Choose & Ask | `choose-ask` | Select symbols to request (errorless). | Requesting | communication | T1–T2 | 2 |
| 81 | Yes / No Quest | `yes-no-quest` | Answer yes/no about pictures. | Receptive language | communication | T1–T2 | 2 |
| 82 | Symbol Story | `symbol-story` | Sequence AAC symbols into a message. | Symbol literacy | communication | T2–T4 | 3 |
| 83 | Word Predictor | `word-predictor` | Fluent AAC sentence-building w/ prediction. | Communication fluency | communication | T3–T5 | 4 |

## 11. Fine-motor & coordination (6)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 84 | Type It *(existing spec)* | `type-it` | Type target letters/words. | Typing, motor | fine_motor | T2–T5 | **1** |
| 85 | Trace & Place | `trace-place` | Trace lines/shapes; tolerance adjustable. | Pre-writing | fine_motor | T1–T3 | 2 |
| 86 | Pop & Tap | `pop-tap` | Tap gentle targets as they appear. | Targeting | fine_motor | T1–T2 | 2 |
| 87 | Drag the Path | `drag-path` | Drag an object along a route. | Sustained motor control | fine_motor | T2–T3 | 3 |
| 88 | Pinch & Build | `pinch-build` | Drag/drop pieces to build a picture. | Grasp-and-release | fine_motor | T2–T3 | 3 |
| 89 | Steady Hand | `steady-hand` | Guide a line without touching edges. | Precision control | fine_motor | T3–T5 | 4 |

## 12. Sensory regulation & calm (6)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 90 | Breathe With Caira | `breathe-caira` | Follow a breathing guide. | Breath regulation | health_wellbeing | T1–T3 | **1** |
| 91 | Calm Canvas | `calm-canvas` | Fluid visuals with touch/gaze. | Sensory soothing | health_wellbeing | T1–T3 | 2 |
| 92 | Sound Garden | `sound-garden` | Build relaxing soundscapes. | Auditory regulation | health_wellbeing | T1–T3 | 3 |
| 93 | Bubble Calm | `bubble-calm` | Pop slow bubbles at your own pace. | Down-regulation | health_wellbeing | T1–T2 | 2 |
| 94 | Glow Trace | `glow-trace` | Follow a slow light with finger/gaze. | Visual tracking, calm | health_wellbeing | T1–T2 | 3 |
| 95 | Zen Sand | `zen-sand` | Rake a calm sand garden, no goal. | Self-regulation | health_wellbeing | T1–T3 | 3 |

## 13. Daily-living & independence (5)

| # | Name | Slug | Description | Target | NDIS | Range | Wave |
|---|---|---|---|---|---|---|---|
| 96 | Morning Routine | `morning-routine` | Order and "do" getting-ready steps. | Routine independence | daily_living | T2–T3 | 3 |
| 97 | Shop Smart | `shop-smart` | Build a list and "buy" items (AU). | Functional numeracy | daily_living | T3–T4 | 4 |
| 98 | Safe Crossing | `safe-crossing` | Practise road-safety decisions. | Community safety | independence | T2–T3 | 3 |
| 99 | Kitchen Steps | `kitchen-steps` | Sequence a simple safe recipe. | Cooking sequence | daily_living | T3–T4 | 4 |
| 100 | Ask for Help | `ask-for-help` | Choose how/where to get help. | Self-advocacy | independence | T2–T3 | 3 |

---

# Deep designs — first five games (the engine-proving set)

These five are designed in full because together they exercise **every** capability the
shared engine needs: a T1 floor game, a tier-spanning game, an adaptive game, an AAC game,
and a fine-motor/input game. If the engine runs these five, the other 95 are content on the
same rails.

### D1 · Touch & Bloom (`touch-bloom`) — T1 floor
- **Loop:** any input event (switch / gaze dwell / touch / key) → a bloom of colour + a soft
  chord + optional haptic at the input location. Nothing else. No score, no end.
- **Why it matters:** proves the engine handles **input-agnostic events**, **no-fail
  sessions**, and **session logging without a score** (`score`/`maxScore` nullable or 0).
- **Accessibility:** every input mode maps to the same event; dwell time, colour palette,
  sound set, and haptic intensity come from the accessibility profile. Reduced-motion swaps
  blooms for slow fades.
- **Goal contribution:** `health_wellbeing` — logs *engagement minutes*, not correctness.
  XP per session is participation-based (worker-configurable, default low).
- **Data:** `GameSession{ gameSlug:'touch-bloom', completed:true, score:0, maxScore:0,
  durationSecs, xpEarned }`. Progress source `game_session`, `valueAdded` = engagement units.

### D2 · Word Match (`word-match`) — T2–T3, adaptive
- **Loop:** a target word (text + audio + symbol) and 2–6 picture choices; tap/scan the
  match. Correct → warm confirm + Caira reaction; incorrect → gentle "try again," the wrong
  option softly dims, never removed harshly.
- **Adaptive difficulty:** choice count and distractor similarity scale on a rolling accuracy
  window. This is the reference implementation of the **adaptive controller** every System A
  game reuses.
- **Accessibility:** symbol+audio on every option; switch-scan with adjustable dwell; words
  drawn from the participant's vocabulary set / AAC board.
- **Goal contribution:** `communication`, `learning`. `xpPerSession` via `GoalGameLink`.

### D3 · Pairs & Pals (`pairs-pals`) — T2–T4, span demo
- **Loop:** flip-and-match memory with Caira characters. Grid scales 2×2 → 6×6.
- **Why it matters:** proves **one title spanning three tiers** purely via configuration —
  the core "appeal to all" claim. T2 = 2×2 with audio cue per card; T4 = 6×6, no cue.
- **Accessibility:** no timer ever; switch-scan cell selection; audio name on each flip.
- **Goal contribution:** `learning` (visual working memory).

### D4 · Choose & Ask (`choose-ask`) — T1–T2, AAC + errorless
- **Loop:** participant selects an AAC symbol to "ask" for an item; the request is voiced
  aloud and the item appears. **Errorless** — every selection produces a valid, rewarded
  outcome; this is communication practice, not testing.
- **Why it matters:** proves **AAC board integration**, **errorless mode**, and **audio
  output of a constructed message** — shared by all communication games.
- **Accessibility:** native AAC board; large hit targets; single-switch scanning.
- **Goal contribution:** `communication` (requesting / functional language).

### D5 · Type It (`type-it`) — T2–T5, input + fine-motor
- **Loop:** target letters/words appear; participant types them. Scales from single large
  letters to full words/sentences.
- **Why it matters:** proves **alternative-keyboard / switch-keyboard input** and a
  fine-motor logging path; spans the full tier range in one title.
- **Accessibility:** on-screen keyboard, switch keyboard, scanning keyboard, word-prediction
  assist (toggle); key size and layout from profile.
- **Goal contribution:** `fine_motor`, `communication`.

---

# Build plan — what I will develop vs what remains

**Sequencing rule:** the shared **engine** ships before any game beyond the proving set.
Per the Master Handover, all of this is Step 5 (System A), pure app code, no legal gate.

### Foundation (build first — required by every game)
- [ ] **Prisma models** — `NDISGoal`, `GoalProgress`, `GoalGameLink`, `GameSession`,
  `ParticipantXP` (from the original handover) + a `gameSlug` registry/catalogue table.
- [ ] **Game engine shell** — input-abstraction layer (switch/gaze/touch/keyboard → unified
  events), accessibility-profile loader, adaptive-difficulty controller, session
  recorder/XP writer, non-punitive feedback + Caira reaction hooks.
- [ ] **Launcher route** — `/games` grid honouring the accessibility profile + tier filter.
- [ ] **Goal-link wiring** — `GameSession` → `GoalProgress` → goal `currentValue` (System A
  only; no social/XP crossover).

### I will develop now — Wave 1 (10 games, the engine-proving set + the 5 specced)
These prove the engine end-to-end across all five capability types and ship the originally
specced five:

1. `touch-bloom` (T1 floor) **— deep-designed (D1)**
2. `cause-caira` (T1, Caira reaction)
3. `same-again` (T2 matching)
4. `word-match` *(existing)* **— deep-designed (D2), adaptive reference**
5. `number-sense` *(existing)* (adaptive numeracy)
6. `pairs-pals` (T2–T4 span demo) **— deep-designed (D3)**
7. `sequence-it` *(existing)* (executive function)
8. `emotion-match` *(existing)* (emotional literacy)
9. `choose-ask` (T1–T2 AAC errorless) **— deep-designed (D4)**
10. `type-it` *(existing)* (T2–T5 input) **— deep-designed (D5)**
11. `breathe-caira` (T1–T3 regulation)

### Still to be done — remaining 89 games, by wave
- **Wave 2 (≈24)** — broaden the floor/early-cognition + core adaptive titles:
  `switch-sparkle`, `gaze-garden`, `light-chaser`, `big-button`, `pop-match`, `sort-bins`,
  `odd-one-out`, `finish-pattern`, `sound-starters`, `build-a-word`, `sentence-builder`,
  `count-along`, `add-take`, `pattern-path`, `whats-missing`, `sound-memory`, `find-target`,
  `same-different`, `sort-it-out`, `first-then`, `feelings-checkin`, `tell-me-more`,
  `yes-no-quest`, `trace-place`, `pop-tap`, `calm-canvas`, `bubble-calm`.
- **Wave 3 (≈27)** — developing tier across all groups: `sound-shake`, `ripple-pool`,
  `wake-animal`, `rumble-rain`, `peekaboo`, `big-small`, `cause-chains`, `hide-seek`,
  `rhyme-time`, `story-steps`, `sight-word-garden`, `coin-cafe`, `clock-keeper`,
  `where-was-it`, `daily-recall`, `face-name`, `digit-span`, `stay-with-it`, `shape-shadows`,
  `picture-pieces`, `spot-difference`, `switch-tracks`, `maze-minds`, `plan-my-day`,
  `goal-path`, `how-feel`, `calm-or-big`, `what-could-help`, `symbol-story`, `drag-path`,
  `pinch-build`, `glow-trace`, `zen-sand`, `sound-garden`, `morning-routine`, `safe-crossing`,
  `ask-for-help`.
- **Wave 4 (≈22)** — the ceiling (savant depth): `word-roots`, `cryptogram`, `times-towers`,
  `fraction-pizza`, `math-sprint`, `logic-numbers`, `memory-palace`, `mental-rotation`,
  `hidden-objects`, `tangram`, `chess-trainer`, `logic-grid`, `tower-builder`, `code-breaker`,
  `recipe-planner`, `budget-buddy`, `what-if`, `read-the-room`, `word-predictor`,
  `steady-hand`, `shop-smart`, `kitchen-steps`.
- **Wave 5 (≈2, heaviest engines)** — `go-gomoku`, `circuit-logic`.

**Definition of done per game:** runs under all four input modes, honours the accessibility
profile, no-fail feedback, writes a valid `GameSession`, contributes to its mapped
NDIS category via `GoalGameLink`, and ships an offline asset bundle.

---

*Framing reminder: every game supports and practises skills. Nothing here treats, cures, or
diagnoses, and no real participant data is used. System A only — no multiplayer, no social
reward crossover.*
