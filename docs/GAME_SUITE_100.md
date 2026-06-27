# Caira Game Suite — 100 Games

**Product backlog · NDIS participant game suite**

Caira is adding a participant-facing game suite. This document catalogues **exactly 100 games** across two strictly separated systems. It is intended to be a usable product backlog: each game has a number, name, one-line description, therapeutic target or social benefit, a key accessibility note, single/multi indication, and a system label (A or B).

---

## Two separate systems — never mixed

Caira runs **two reward systems that must never be merged**.

- **System A — Therapeutic games** *contribute to NDIS goal progress.* Single-player, accessibility-first, adaptive difficulty, offline-capable. Designed for participants with cognitive, intellectual, sensory, motor, communication, autism, and acquired-brain-injury support needs. The five already specced — Word Match, Number Sense, Sequence It, Emotion Match, Type It — are part of this set. Earning XP, streaks, and unlocks against a participant's NDIS goals happens **only here**.

- **System B — Social / multiplayer games** are for **connection and engagement only.** They do **not** contribute to NDIS goal XP, goal progress, or therapeutic rewards — **the reward is the connection itself.** Turn-based; played only between participants with **guardian/coordinator-approved connections**, **within the same organisation by default**, **AI safety-scanned**, and gated behind **feature flags plus legal review** before any release.

> **Hard rule for engineering and product:** a System B game must never write to goal progress, never grant therapeutic XP, and never appear inside a goal/reward surface. System A and System B share a launcher and an accessibility layer — nothing else.

---

## Accessibility baseline (applies to all 100 games)

Every game in this suite — System A and System B — ships against this baseline. Individual rows only note **deviations or standout features**; assume all of the following unless stated otherwise.

- **Input flexibility:** switch access (1- and 2-switch scanning), eye-gaze, touch, keyboard, and pointer. No game requires fine timing or rapid input to progress.
- **Output flexibility:** screen-reader compatible, audio cues for every key event, captions for all spoken/sound content, optional voice-over narration of instructions.
- **Visual adjustability:** high-contrast themes, adjustable text size, reduced-motion mode, colour-blind-safe palettes, dyslexia-friendly font option.
- **No time pressure mode:** available on every game; timers are always optional and off by default.
- **Calm, non-punitive feedback:** no shaming fail-states, no "game over," no loss sounds. Mistakes are met with gentle re-try prompts and encouragement.
- **Adjustable complexity:** difficulty, number of items, and distractors are configurable; System A games adapt automatically and can also be set manually by a worker.
- **Offline play:** System A games are fully offline-capable. System B requires connectivity for turns but degrades gracefully.
- **AAC-friendly:** symbol support, large hit targets, and compatibility with the participant's AAC board; no game depends on speech.
- **Accessibility profiles:** a participant's saved profile auto-configures input, contrast, text, motion, and complexity across every game on first launch.

**Clinical framing:** games **support and practise** skills. They do not treat, cure, or diagnose any condition. No medical claims are made and no real participant data appears in this document.

---

## Catalogue at a glance

| System | Games | Categories |
|---|---|---|
| **A — Therapeutic** | 60 | Literacy & language; numeracy; memory & recall; executive function / sequencing & planning; emotional literacy & social cognition; communication & AAC; fine-motor & coordination; sensory regulation & calming; daily-living & life-skills; attention & focus; visual perception |
| **B — Social / multiplayer** | 40 | Cooperative play; turn-based casual; creative & expressive (co-create); party & quiz; rhythm & music; word & guessing; shared exploration |
| **Total** | **100** | |

---

# System A — Therapeutic games (60)

Single-player. Contributes to NDIS goal progress. Adaptive difficulty, offline-capable, non-punitive.

## A1. Literacy & language (8)

Supports reading, vocabulary, phonics, and written-language skills.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 1 | **Word Match** *(existing)* | Match a word to its picture or meaning. | Vocabulary, word–object association | Symbol + audio pairing for every word | Single | A |
| 2 | **Sound Starters** | Pick the picture that begins with a target sound. | Phonological awareness, initial sounds | Audio plays the sound; no reading required | Single | A |
| 3 | **Build-a-Word** | Drag letters/syllables to form a target word. | Spelling, decoding, blending | Large draggable tiles; switch-scannable | Single | A |
| 4 | **Rhyme Time** | Choose the word that rhymes with the prompt. | Rhyme & sound patterns | Spoken prompt + picture support | Single | A |
| 5 | **Sentence Builder** | Arrange word cards into a simple sentence. | Syntax, sentence construction | AAC-symbol word cards | Single | A |
| 6 | **Story Steps** | Order picture cards to retell a short story. | Reading comprehension, narrative | Pictures + optional read-aloud | Single | A |
| 7 | **Sight Word Garden** | Recognise high-frequency words to grow a garden. | Sight-word fluency | Calm growth animation, reduced-motion option | Single | A |
| 8 | **Label It** | Tap the correct label for everyday objects. | Vocabulary, naming | Real-photo objects, audio labels | Single | A |

## A2. Numeracy (8)

Supports number sense, counting, arithmetic, money, and time.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 9 | **Number Sense** *(existing)* | Compare and order quantities and numerals. | Number magnitude, comparison | Quantities shown as dots + numerals | Single | A |
| 10 | **Count Along** | Count objects and select the matching number. | One-to-one counting | Tap-to-count with audio feedback | Single | A |
| 11 | **Coin Café** | Pay for items using virtual coins/notes. | Money handling, addition | Australian currency images, audio totals | Single | A |
| 12 | **Clock Keeper** | Match analogue and digital times to activities. | Time-telling, daily structure | Both clock styles, spoken times | Single | A |
| 13 | **Add & Take** | Solve simple add/subtract with visual supports. | Addition, subtraction | Number line + objects, no timer | Single | A |
| 14 | **Pattern Path** | Continue a number or shape pattern. | Patterning, sequencing logic | High-contrast tiles | Single | A |
| 15 | **Measure Up** | Order items by length, weight, or size. | Measurement, comparison | Drag-to-order, audio cues | Single | A |
| 16 | **Share Fair** | Split items equally between characters. | Division, fair sharing | Visual grouping, gentle prompts | Single | A |

## A3. Memory & recall (6)

Supports working memory, visual/auditory recall, and recognition.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 17 | **Pairs & Pals** | Classic flip-and-match memory with Caira characters. | Visual working memory | Adjustable grid size; no timer | Single | A |
| 18 | **What's Missing?** | Spot the item removed from a small set. | Visual recall, attention | Few items by default; audio recap | Single | A |
| 19 | **Sound Memory** | Repeat a growing sequence of sounds. | Auditory working memory | Visual + audio cue per step | Single | A |
| 20 | **Where Was It?** | Remember where objects were hidden. | Spatial memory | Large zones, switch-scannable | Single | A |
| 21 | **Daily Recall** | Recall steps of a familiar routine just shown. | Episodic recall, routine | Photo-based, re-watch allowed | Single | A |
| 22 | **Face & Name** | Match remembered faces to names. | Social memory, recognition | Optional photos of known people | Single | A |

## A4. Executive function / sequencing & planning (6)

Supports ordering, planning, task initiation, and flexible thinking.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 23 | **Sequence It** *(existing)* | Put steps of an activity in the right order. | Sequencing, task order | Picture steps + audio narration | Single | A |
| 24 | **Plan My Day** | Drag activities into a visual daily schedule. | Planning, time structure | Visual timetable, AAC symbols | Single | A |
| 25 | **First–Then** | Choose what comes first and what comes next. | Task sequencing, transitions | Two-card simplicity, switch-friendly | Single | A |
| 26 | **Sort It Out** | Group objects by category or rule. | Categorisation, flexible thinking | Audio category labels | Single | A |
| 27 | **Goal Path** | Break a goal into ordered small steps. | Goal planning, task analysis | Mirrors NDIS goal language | Single | A |
| 28 | **Switch Tracks** | Follow a changing rule (e.g., colour then shape). | Cognitive flexibility, set-shifting | Clear rule prompts, no penalty | Single | A |

## A5. Emotional literacy & social cognition (6)

Supports recognising, naming, and responding to emotions.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 29 | **Emotion Match** *(existing)* | Match faces or scenarios to emotion words. | Emotion recognition, naming | Symbol + audio emotion labels | Single | A |
| 30 | **How Would They Feel?** | Predict a character's feeling in a situation. | Perspective-taking, empathy | Short captioned scenarios | Single | A |
| 31 | **Calm or Big?** | Sort feelings by intensity (calm to big). | Emotional regulation awareness | Visual intensity scale, AAC-ready | Single | A |
| 32 | **My Feelings Check-In** | Pick how you feel right now from a board. | Self-awareness, expression | AAC feelings board, no right/wrong | Single | A |
| 33 | **What Could Help?** | Choose a coping strategy for a feeling. | Coping strategies, self-regulation | Strategy cards with pictures | Single | A |
| 34 | **Read the Room** | Interpret tone/body-language cues in a scene. | Social cognition, cue reading | Captions + audio description | Single | A |

## A6. Communication & AAC (5)

Supports expressive/receptive language and AAC use.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 35 | **Tell Me More** | Build a message from AAC symbols to a prompt. | Expressive communication | Native AAC board integration | Single | A |
| 36 | **Choose & Ask** | Select symbols to "ask" for an item. | Requesting, functional language | Errorless choice, audio output | Single | A |
| 37 | **Yes / No Quest** | Answer yes/no questions about pictures. | Receptive language, response | Two large targets, switch-ready | Single | A |
| 38 | **Symbol Story** | Sequence AAC symbols into a short message. | Symbol literacy, narrative | Symbol set matches participant's board | Single | A |
| 39 | **Conversation Cards** | Practise turn cues in a guided chat (with a worker). | Pragmatic / turn-taking skills | Co-op with support worker option | Single | A |

## A7. Fine-motor & coordination (5)

Supports controlled movement, tracing, and targeting.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 40 | **Type It** *(existing)* | Type target letters/words on screen. | Typing, letter location, motor | On-screen + switch keyboard support | Single | A |
| 41 | **Trace & Place** | Trace lines and shapes with finger/stylus. | Pre-writing, controlled movement | Tolerance is adjustable; no fail | Single | A |
| 42 | **Pop & Tap** | Tap gentle targets as they appear. | Targeting, hand–eye coordination | Large targets, no time pressure | Single | A |
| 43 | **Drag the Path** | Drag an object along a winding route. | Sustained motor control | Wide path tolerance, eye-gaze option | Single | A |
| 44 | **Pinch & Build** | Drag/drop pieces to build a picture. | Grasp-and-release, dexterity | Switch-and-scan build mode | Single | A |

## A8. Sensory regulation & calming (5)

Supports self-regulation, calming, and sensory exploration.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 45 | **Breathe With Caira** | Follow a breathing guide animation. | Calming, breath regulation | Audio + visual + haptic pacing | Single | A |
| 46 | **Calm Canvas** | Make gentle fluid visuals with touch/gaze. | Sensory soothing, regulation | Eye-gaze paint, reduced-motion safe | Single | A |
| 47 | **Sound Garden** | Build relaxing soundscapes from elements. | Auditory regulation, choice | Volume + frequency limits, no startle | Single | A |
| 48 | **Bubble Calm** | Pop slow-rising bubbles at your own pace. | Down-regulation, focus on calm | No timer, no score, switch-ready | Single | A |
| 49 | **Glow Trace** | Follow a slow light with finger or gaze. | Visual tracking, calming focus | Gaze-friendly, dim high-contrast | Single | A |

## A9. Daily-living & life-skills (6)

Supports independence and everyday routines.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 50 | **Morning Routine** | Order and "do" steps of getting ready. | Daily living, routine independence | Photo steps, re-watchable | Single | A |
| 51 | **Shop Smart** | Build a shopping list and "buy" items. | Functional numeracy, planning | Australian context, audio prices | Single | A |
| 52 | **Safe Crossing** | Practise road-safety decisions in a scene. | Community safety awareness | Slow, no-fail decision prompts | Single | A |
| 53 | **Kitchen Steps** | Sequence a simple safe recipe. | Cooking sequence, safety cues | Picture recipe, hazard highlights | Single | A |
| 54 | **Tidy Up** | Sort items to where they belong at home. | Categorisation, home routines | AAC labels for rooms/objects | Single | A |
| 55 | **Ask for Help** | Choose how/where to get help in a situation. | Help-seeking, self-advocacy | Scenario cards + AAC responses | Single | A |

## A10. Attention & focus (3)

Supports sustained and selective attention.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 56 | **Find the Target** | Find a specific item among distractors. | Selective attention, scanning | Distractor count adjustable | Single | A |
| 57 | **Stay With It** | Watch for a signal in a calm stream. | Sustained attention, vigilance | Gentle cues, no startle sounds | Single | A |
| 58 | **Same or Different** | Decide if two items match. | Discrimination, focused attention | Two large panels, switch-ready | Single | A |

## A11. Visual perception (2)

Supports visual discrimination, spatial reasoning, and matching.

| # | Name | Description | Practises / target | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 59 | **Shape Shadows** | Match shapes to their outlines/shadows. | Form constancy, matching | High-contrast outlines | Single | A |
| 60 | **Picture Pieces** | Complete a picture from a few large pieces. | Visual closure, spatial reasoning | Few large pieces; snap-assist | Single | A |

---

# System B — Social / multiplayer games (40)

**Connection only. No NDIS XP, no goal progress, no therapeutic rewards — the reward is the connection.** Turn-based, within-organisation, approved connections only, AI safety-scanned, behind feature flags pending legal review.

### Safeguarding note (applies to all System B games)

- **No free-text chat with strangers.** Communication is limited to in-game actions, fixed emoji/sticker sets, and pre-approved AAC/quick phrases — never open free text to unknown users.
- **Within-organisation by default.** Players are matched only with other participants in the same organisation unless explicitly extended and approved.
- **Guardian / coordinator approval required.** A connection must be approved before any shared play; either party's guardian or coordinator can revoke it at any time.
- **AI safety scanning.** All shared content (drawings, custom inputs, stickers) is scanned before it reaches another player; flagged content is blocked and logged.
- **Mandatory-reporting awareness.** Workers and the platform follow mandatory-reporting obligations; reporting and block/mute controls are one tap away on every screen.
- **No data crossover.** System B activity is never written to goals, never shown as therapeutic progress, and never used to compute NDIS outcomes.

## B1. Cooperative play (7)

Players work together toward a shared, non-competitive goal.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 61 | **Garden Together** | Co-grow a shared virtual garden over turns. | Shared goal, belonging | Asynchronous turns, no time limit | Multi | B |
| 62 | **Build Buddies** | Take turns adding to a shared build. | Collaboration, contribution | Switch-and-scan placing | Multi | B |
| 63 | **Treasure Team** | Solve a gentle co-op puzzle in turns. | Teamwork, joint attention | Hints shared, no-fail | Multi | B |
| 64 | **Care Critters** | Jointly look after a shared pet. | Nurturing, shared routine | Simple tap actions, AAC prompts | Multi | B |
| 65 | **Bridge It** | Place pieces together to connect two sides. | Cooperation, turn-taking | Large pieces, audio confirm | Multi | B |
| 66 | **Color the World** | Co-fill a shared colouring scene. | Creative togetherness | Eye-gaze fill, reduced-motion | Multi | B |
| 67 | **Quest Pals** | Progress a story together, each choosing steps. | Shared narrative, connection | Picture choices, captions | Multi | B |

## B2. Turn-based casual (7)

Classic light games, friendly and low-stakes.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 68 | **Connect Calm** | Connect-four-style gentle line game. | Friendly play, attention to other | Large grid, switch-ready | Multi | B |
| 69 | **Match Mates** | Take turns flipping a shared memory board. | Shared focus, patience | Adjustable grid, no timer | Multi | B |
| 70 | **Snakes & Smiles** | Roll-and-move board with kind events only. | Light-hearted turn-taking | Auto-roll option, audio cues | Multi | B |
| 71 | **Tic-Tac-Together** | Friendly noughts-and-crosses. | Simple back-and-forth play | High-contrast marks | Multi | B |
| 72 | **Card Companions** | Easy matching card game. | Social turn-taking | Symbol cards, large faces | Multi | B |
| 73 | **Dot Lines** | Take turns drawing lines to make boxes. | Gentle strategy, sharing | Switch-scannable lines | Multi | B |
| 74 | **Roll & Reveal** | Reveal shared picture tiles on each turn. | Anticipation, shared joy | Audio reveal, no penalties | Multi | B |

## B3. Creative & expressive — co-create (6)

Players make something together. All shared output is AI safety-scanned.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 75 | **Draw Together** | Co-draw on a shared canvas in turns. | Joint creativity, expression | Eye-gaze + stamp tools; scanned | Multi | B |
| 76 | **Story Swap** | Build a story together a panel at a time. | Shared storytelling | Picture/AAC panels; scanned | Multi | B |
| 77 | **Make a Tune** | Add notes to a shared melody by turn. | Co-creation, listening | Tap notes, no music skill needed | Multi | B |
| 78 | **Comic Pals** | Fill a shared comic strip together. | Humour, collaboration | Symbol bubbles, captions; scanned | Multi | B |
| 79 | **Sticker Scene** | Decorate a shared scene with approved stickers. | Self-expression, sharing | Fixed safe sticker set only | Multi | B |
| 80 | **Mood Mural** | Add to a shared mural reflecting feelings. | Connection, shared expression | AAC feeling stamps; scanned | Multi | B |

## B4. Party & quiz (6)

Light group games for a few approved players at once.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 81 | **Caira Quiz** | Friendly picture-based quiz, no losers. | Shared fun, inclusion | Picture answers, audio questions | Multi | B |
| 82 | **Guess the Picture** | Reveal a picture slowly; everyone guesses. | Group engagement | Tap-to-guess, captions | Multi | B |
| 83 | **This or That** | Vote between two fun options together. | Shared opinions, belonging | Two large options, AAC vote | Multi | B |
| 84 | **Trivia Buddies** | Easy trivia with picture supports. | Friendly knowledge sharing | No-timer mode default | Multi | B |
| 85 | **Spin the Wheel** | Take turns spinning for kind challenges. | Turn-taking, shared laughs | Auto-spin, audio result | Multi | B |
| 86 | **Bingo Together** | Picture/symbol bingo as a group. | Group ritual, anticipation | Audio call-outs, AAC marking | Multi | B |

## B5. Rhythm & music (4)

Shared rhythm and music play. No fail-states.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 87 | **Tap in Time** | Take turns adding to a group rhythm. | Shared rhythm, synchrony | No precision required, no fail | Multi | B |
| 88 | **Echo Beats** | Pass a simple beat back and forth. | Listening, turn-taking | Visual + audio beat cues | Multi | B |
| 89 | **Band Together** | Each picks an instrument layer to add. | Co-creation, contribution | One-tap instrument layers | Multi | B |
| 90 | **Sing-Along Scene** | Follow a shared song with captioned lyrics. | Shared joy, participation | Captions, adjustable tempo | Multi | B |

## B6. Word & guessing (5)

Word and guessing games with **no free-text chat** — choices and symbols only.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 91 | **Picture Charades** | Convey a word using only pictures/actions. | Shared humour, communication | Symbol prompts, no speech needed | Multi | B |
| 92 | **Word Builder Duo** | Take turns adding letters to a shared word. | Collaborative play | Large tiles; safety-scanned result | Multi | B |
| 93 | **Guess My Pick** | Give picture clues; partner guesses. | Joint attention, sharing | Pre-set clue cards only | Multi | B |
| 94 | **Category Pals** | Add items to a shared category in turns. | Collaboration, vocabulary fun | Picture/AAC item picker | Multi | B |
| 95 | **Emoji Story** | Tell a mini-story in approved emojis together. | Playful expression | Fixed safe emoji set; scanned | Multi | B |

## B7. Shared exploration (5)

Explore calm worlds together, side by side.

| # | Name | Description | Social benefit | Accessibility highlight | S/M | Sys |
|---|---|---|---|---|---|---|
| 96 | **Explore Together** | Roam a calm shared map and find things. | Companionship, shared discovery | Auto-move option, eye-gaze | Multi | B |
| 97 | **Aquarium Visit** | Watch and tag a shared calm aquarium. | Co-presence, gentle sharing | No goals, reduced-motion safe | Multi | B |
| 98 | **Sky Watchers** | Spot shapes in a shared sky together. | Shared wonder, joint attention | Audio descriptions, captions | Multi | B |
| 99 | **Trail Friends** | Walk a scenic trail and share moments. | Companionship, slow play | No timer, switch navigation | Multi | B |
| 100 | **Campfire Hangout** | A calm shared "hang out" space with light activities. | Belonging, low-pressure connection | Presence-only; safe sticker set | Multi | B |

---

# Additional engagement features

Layered on top of the catalogue to deepen engagement while preserving the System A / System B separation. None of these convert connection into therapeutic reward.

1. **Caira character unlocks** — earn and customise Caira companions as **System A** goal rewards; characters can appear cosmetically in System B but grant nothing there.
2. **Daily calm / mindfulness activity** — a short, optional daily breathing or grounding moment (System A sensory category), never streak-punishing.
3. **Co-op play with a support worker** — any System A game can be run side-by-side with a worker for scaffolding and modelling (not a System B social match).
4. **Real-world reward fulfilment workflow** — convert earned System A rewards into pre-approved real-world items/experiences via a worker-and-guardian approval flow.
5. **AAC board integration** — the participant's existing AAC vocabulary is available inside every game; symbols stay consistent across the suite.
6. **Sensory rooms** — themed calming environments (light, sound, visuals) the participant can enter any time, outside any scoring.
7. **Progress visualisations** — clear, strengths-based progress views for participant **and** family, framed as "skills practised," never clinical claims.
8. **Worker-set challenges** — support workers/coordinators can set gentle, goal-aligned challenges in System A, with no-pressure framing.
9. **Seasonal & cultural events** — rotating themes (including NAIDOC, holidays, local seasons) that refresh cosmetics and optional activities.
10. **Accessibility profiles that auto-configure every game** — one saved profile sets input, contrast, text, motion, audio, and complexity across all 100 games on launch.
11. **Calm mode / sensory-safe toggle** — a global one-tap switch that strips animation, reduces sound, and softens visuals everywhere.
12. **Streak-free encouragement** — recognition for participation and effort, with no loss-of-streak penalty and no shaming for breaks.
13. **Family & circle-of-support viewer** — read-only, consent-gated window for approved family/coordinators into achievements (System A only).
14. **Co-regulation cues** — optional breathing/regulation prompts that can surface between activities when a participant signals overwhelm.
15. **Audio-first / eyes-free mode** — a fully narrated path through key games for participants who rely primarily on sound.

---

# Build & sequencing note

This suite maps to the Master Handover sequence. Building it in order keeps the two reward systems cleanly separated in code and in compliance.

- **Step 5 — Goals + gamification + the 5 therapeutic games.** Ship the **System A** foundation: NDIS goals, the gamification/XP/reward engine, accessibility baseline + profiles, and the five already-specced games (Word Match, Number Sense, Sequence It, Emotion Match, Type It). This is the only place therapeutic XP and goal progress exist. Expand the remaining System A categories on this same engine.
- **Step 6 — Safe social connections (flag OFF).** Build the **connection layer** for System B: within-org matching, guardian/coordinator approval, AI safety scanning, block/mute/report, and mandatory-reporting awareness — all behind a feature flag and pending legal review. No gameplay rewards here; the layer only governs who may connect.
- **Step 7 — Multiplayer architecture placeholder (flag OFF).** Stand up the **turn-based multiplayer** scaffolding for System B games, kept behind a feature flag and legal review. Games here deliver connection only.

**Restate the rule:** System A games contribute to NDIS goal progress and rewards; System B games contribute **only connection** — never XP, never goal progress, never therapeutic reward. The two systems share the launcher and the accessibility layer and **nothing else**. No System B game may write to goals or surface inside a goal/reward screen.

*Framing reminder: every game in this document supports and practises skills. Nothing here treats, cures, or diagnoses any condition, and no real participant data is used.*
