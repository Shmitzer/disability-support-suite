# Caira Game Suite — 100-Game Appropriateness Review

**Reviewers:** game design · engineering · NDIS practice
**Scope:** `docs/GAME_SUITE_SINGLEPLAYER_100.md` (catalogue) + `src/lib/games/catalogue.ts` (registry)
**Date:** 2026-06-26

This is an advisory review, not a build change. It rates the catalogue for clinical/NDIS
appropriateness, accessibility integrity, and game-design soundness, then lists concrete
changes. Findings are graded **[Must]** (fix before participants see it), **[Should]**
(fix before scale-out past Wave 1), **[Consider]** (design polish).

---

## 1. Overall verdict

The catalogue is **strong and unusually well-framed**. The tier spine (T1 floor → T5
ceiling), the "no separate disabled version — the same title grows with the participant"
principle, and the non-punitive/no-fail baseline are exactly right for an NDIS participant
audience and put this well ahead of typical "special-needs app" content. The clinical
framing ("support and practise, not treat/cure/diagnose") is correct and must be held.

The issues below are about **edges**, not the core: a handful of games carry safety or
dignity risk, several NDIS goal mappings are loose, and the engine needs a few guarantees
the prose promises but code can't yet enforce.

---

## 2. NDIS-consultant findings (appropriateness, safety, dignity, claims)

**[Must] `safe-crossing` (#98) — road-safety practice frames as a skill transfer it cannot
safely make.** A screen game that "practises road-safety decisions" risks implying a
participant is road-safe when they are not — a real safety-liability and a duty-of-care
concern for the support worker who logs progress against it. *Change:* reframe explicitly as
**"recognise the signals"** (spot the green man, hear the beeps) — comprehension only — and
add a worker-facing note in the game card: *"Builds awareness only. Does not assess or
confer real-world road safety. Always supervise actual crossings."* Same caution applies in
lighter form to `kitchen-steps` (#99) — keep it to *sequencing* the steps, never implying
safe unsupervised cooking.

**[Must] Age-neutral art direction, enforced as a content rule.** The floor games
(`peekaboo`, `wake-animal`, `big-button`, balloon/bubble pops) read as toddler content. A
45-year-old man with severe ABI using a single switch must not be handed nursery graphics —
that is the single biggest dignity failure in this category of product. The tier system
already separates *difficulty*; it must also separate *aesthetic*. *Change:* add an
**age-band asset theme** (child / teen / adult) to the accessibility profile, independent of
tier, so `touch-bloom` at T1 can render as an adult-respectful abstract bloom, not cartoon
animals. Rename `peekaboo` → **`now-you-see-it`** to drop the infant connotation.

**[Should] Goal-category mappings that won't survive a plan-manager's eye.** NDIS progress
must map credibly to the participant's funded goals. Several are a stretch:
- `gaze-garden`, `light-chaser` mapped to **`fine_motor`** — these are gaze/visual-tracking,
  not motor. Map to `health_wellbeing` or a new `sensory`/`vision` tag; reserve `fine_motor`
  for games with an actual motor-output demand (`type-it`, `trace-place`, `steady-hand`).
- `big-small` (#15) → `numeracy` is defensible but thin; tag `learning` primary, `numeracy`
  secondary.
- `cause-caira` (#8) → `social_participation`: reacting to an on-screen character is *not*
  social participation in the NDIS sense (community/people). Re-tag `health_wellbeing` +
  `communication`; keep `social_participation` for genuinely interpersonal-cognition games
  (`face-name`, `read-the-room`, `social-detective`).

**[Should] "XP", "towers", "sprint", "quest" gamification vs. dignity + claims.** Reward
language is fine for kids but can read as infantilising for adults and risks edging toward a
*therapeutic-outcome* claim if XP is shown as progress against a clinical goal. Keep XP as an
**internal engagement metric**, never surface "XP" to the participant by default (profile
toggle), and ensure the worker-facing report says "engagement / practice minutes," not
"improvement."

**[Should] Emotional-safety guardrail for the social/emotional group (#72–78).** Games that
ask "how would they feel?" / "read the room" must never score a participant's *own* emotional
read as "wrong" — for autistic participants that is both inaccurate (alexithymia ≠ deficit)
and harmful. *Change:* these run **errorless / exploratory** by default, framed as "one way
to see it," with no red-X feedback. `feelings-checkin` (#75) must be pure self-report —
**never** scored, never have a "correct" feeling.

**[Consider] AU-localisation is a claim-surface.** `coin-cafe`, `shop-smart`, `clock-keeper`
must use AUD and Australian conventions (already noted for coins). Good — keep it explicit in
each game's DoD so a US-styled asset never ships.

---

## 3. Game-design findings (ceiling, IP, engine cost, engagement)

**[Must] IP / licensing on named "ceiling" games.** `chess-trainer`, `go-gomoku`,
`tangram`, `code-breaker` (Mastermind), `logic-numbers` (Sudoku/KenKen — **KenKen is
trademarked**) — the *rules* are public domain but the **names and many asset sets are not**.
*Change:* ship generic names (`code-breaker` already good; rename KenKen reference to
"math-grid"/"calc-grid"), and use only original or open-licensed piece art. Flag for legal
before Wave 4.

**[Must] Engine-cost honesty on the ceiling tier.** `chess-trainer` ("full chess + puzzle
ladder + hints"), `go-gomoku`, and `circuit-logic` are each a *multi-week engine*, not
"content on the same rails" as the prose claims. A real chess AI + puzzle DB + hint engine is
not a config of the shared loop. *Change:* either (a) descope to **puzzle-only** (curated
positions, no live opponent AI) for v1, or (b) integrate a vetted open-source engine
(e.g. a permissively-licensed chess move generator) and budget it as its own line item. The
"95 games are just content" claim is true for ~80 of them and **false** for the ~6 deep
strategy/logic engines — say so in the build plan.

**[Should] The ceiling is thinner than the floor for the actual target user.** The NDIS
participant population is weighted toward T1–T3. 22 games sit at T4–T5 (savant ceiling) that
may serve <5% of participants, while only ~10 truly span into adult-cognition-but-low-input
territory (the bigger real cohort: capable mind, severe motor/communication impairment).
*Consider:* before building all of Wave 4, add 2–3 titles for **"high cognition, switch-only
input"** — e.g. a switch-scanning chess/logic interface — which is higher-value than a third
maths-ceiling game.

**[Consider] Near-duplicate mechanics — thin the list, don't pad to 100.** Several pairs are
the same engine with re-skinned content and could be *modes* of one game rather than two
catalogue entries: `same-again`/`same-different`; `pop-match`/`find-target`; `sort-bins`/
`sort-it-out`; `bubble-calm`/`pop-tap`; `glow-trace`/`light-chaser`/`drag-path` (three
follow-the-thing variants). Collapsing 6–8 of these into parameterised modes reduces build
cost with zero loss of participant value, and "92 distinct games" honestly beat "100 with
filler." If 100 is a marketing number, keep it but track *engine count* internally.

**[Consider] No-fail ≠ no-feedback.** The non-punitive baseline is right, but T4–T5 players
need *legible challenge* or they disengage (the original "low ceiling = boring" problem this
doc set out to fix). Ensure adaptive difficulty can actually push a strong player to genuine
failure-adjacent difficulty (just framed as "tricky!" not "wrong"), otherwise the ceiling
collapses back to the floor.

---

## 4. Engineering findings (does the code keep the doc's promises?)

**[Must] Accessibility baseline is asserted, not enforced.** The doc promises switch / gaze /
keyboard / SR for **all 100**, but that lives in prose. *Change:* make the engine's
`GameDef` carry a `supportedInputs`/`a11yChecklist` and have a **CI test fail** any game that
doesn't declare full input coverage + no-timer + non-punitive feedback. `test/games-engine.test.ts`
already checks catalogue integrity — extend it to assert the a11y contract per game so the
baseline can't silently regress as content is added.

**[Should] Category-tag drift between prose and `catalogue.ts`.** Spot-checks already differ
(e.g. `word-match` doc says `communication`; code says `["communication","learning"]` — fine,
but `cause-caira` mapping above needs to change in **both**). *Change:* generate the prose
table *from* `catalogue.ts` (single source of truth) so they cannot drift — the project's own
"don't let design and implementation drift" rule applies here too.

**[Should] `scored` flag vs. emotional/self-report games.** Ensure `feelings-checkin`,
`calm-canvas`, `zen-sand`, `breathe-caira`, and the emotion-perspective games are `scored:
false` (engagement-only) in the registry, matching finding §2. Verify in `catalogue.ts`.

**[Consider] Offline asset bundle is in the DoD but not the type.** "Ships an offline asset
bundle" is per-game DoD; add an `assetBundle`/`offlineReady` field so the launcher can refuse
to show a game whose bundle isn't present, rather than failing at runtime on a participant's
device.

---

## 5. Concrete change list (actionable)

| # | Game / area | Change | Grade |
|---|---|---|---|
| 98 | `safe-crossing` | Reframe to *signal recognition*; add supervision disclaimer | Must |
| all floor | art direction | Add age-band asset theme (child/teen/adult) decoupled from tier | Must |
| 14 | `peekaboo` | Rename `now-you-see-it` | Should |
| 3,6 | `gaze-garden`,`light-chaser` | Re-tag off `fine_motor` → sensory/vision | Should |
| 8 | `cause-caira` | Re-tag off `social_participation` | Should |
| 59,60,64 | chess/go/circuit | Descope to puzzle-only v1 or budget as own engines; fix the "just content" claim | Must |
| 37,58,59 | KenKen/tangram/chess | IP pass — generic names + open assets before Wave 4 | Must |
| 72–78 | emotion/social | Errorless by default; never score a participant's own emotional read | Should |
| 75 | `feelings-checkin` | Pure self-report, `scored:false` | Must |
| — | XP surfacing | Internal/engagement only; off by default for participant; "practice minutes" in reports | Should |
| — | duplicates | Collapse ~6–8 re-skins into modes; track engine-count internally | Consider |
| — | engine | CI-enforce a11y contract per `GameDef`; generate prose table from `catalogue.ts` | Must/Should |
| — | cohort gap | Add 2–3 high-cognition + switch-only titles before more T4–T5 maths | Consider |

---

## 6. What to keep (don't regress)

- The T1–T5 spine and "same title grows with the participant" — keep, it's the product's edge.
- No timers / no game-over / no shaming as a hard baseline — keep, CI-enforce.
- One saved accessibility profile auto-configuring every game — keep; extend it with the
  age-band theme (§2).
- The non-medical-claims framing — keep verbatim; it gates the whole suite legally.
