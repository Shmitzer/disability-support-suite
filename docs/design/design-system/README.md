# Caira — Design System

> **"Sage & Clay"** — the design system for **Caira**, a disability-support shift-logging app.
> Warm, calm, paper-like. Built for support workers logging care on a phone, one-handed, mid-shift.

Caira helps a support worker capture what happened on a shift — meals, fluids, hygiene, activity, toileting, medication, plus free notes and incidents — quickly and with dignity. The product philosophy: **behind every log is a person.** Urgency is handled with reassurance, not alarm; hit targets are large; the palette is soft and unclinical.

---

## Sources (provenance)

This system was reverse-engineered from the product's own source of truth. If you have access, explore these to go deeper:

- **GitHub:** [`Shmitzer/disability-support-suite`](https://github.com/Shmitzer/disability-support-suite) (private) — a Next.js 16 + React 19 app on Supabase/Prisma.
  - `src/app/globals.css` — the canonical "Sage & Clay" tokens (mirrored here).
  - `docs/design/` — the design source of truth: `HANDOFF.md`, `.dc.html` prototypes (`Caira Tracker`, `Caira Tablet & Web`, `Caira Logo Final`), and `screenshots/`.
  - `src/components/` — the live React implementation (`ShiftTracker.tsx`, `PaperIcon.tsx`, `BottomNav.tsx`, …) the kits were modelled on.
- **Uploaded reference:** `uploads/1782211437969.png` — an annotated phone "Log Shift Event" concept (an earlier, busier interaction model; the calmer Tablet-A model in `HANDOFF.md` is the current reference).

> The design changes in `docs/design/` first; the app in `src/` is built to match. This design system extracts that brand into reusable tokens, assets, and components.

---

## Brand in one breath

| | |
|---|---|
| **Name** | Caira |
| **Tagline** | *Support, logged with care* |
| **Mark** | A solid heart with a "C" carved into the upper-left lobe, opening tilted up (~−18°). |
| **Primary** | Teal `#0f766e` |
| **Accent** | Clay / terracotta `#df5b40` |
| **Canvas** | Warm paper `#f3ebdd` |
| **Display font** | Bricolage Grotesque (700/800) |
| **Body font** | Figtree (400–700) |

---

## CONTENT FUNDAMENTALS

How Caira writes.

- **Voice:** plain, warm, human. Reassuring without being soft. Talks like a calm, competent colleague — never a compliance officer.
- **Person-first, always.** *"Behind every log is a person."* Refer to the person being supported as the **participant** (the term is sector-configurable — *client*, *resident* — via `sectorLabels()` in the app). Never reduce them to a record.
- **You / your.** Address the worker directly: *"See your next shift,"* *"type your note below."* First-person plural ("we") only for the product/company in marketing.
- **Casing:** sentence case for everything readable — headings, buttons, labels (*"Save Food"*, *"Add a note (optional)"*, *"Tap a category to log"*). UPPERCASE is reserved for tiny tracked **eyebrows / overlines** (`KEY CONTACTS`, `ON SHIFT · 07:31`) and the one deliberately-loud status, *REPORT AN INCIDENT* — and even that is rendered in a calm muted clay, not red.
- **Tone on urgency:** *reassurance over alarm.* Medication and incidents are important but never shouty. Copy is matter-of-fact: *"Confirm received,"* *"Voice transcription is coming soon — type your note below."*
- **Brevity:** short lines, glanceable. A worker reads these mid-task. Prefer *"Water · full glass"* over a sentence.
- **No emoji.** None in product UI. Iconography carries visual meaning (see below). Em-dashes and middots (`·`) are used as soft separators.
- **Marketing voice** is a touch more confident but still grounded: *"Support work, minus the paperwork."* *"Caira keeps shifts, notes and mileage in one place, so you can spend less time on admin and more time on support."* Lead with the Shift Tracker; earn trust; introduce modules later (shown as "Soon").
- **Examples to emulate / avoid** live in the **Brand → Voice & tone** specimen card.

---

## VISUAL FOUNDATIONS

The feel: **warm paper, soft edges, calm depth.** Nothing harsh, nothing clinical.

- **Colour:** a teal primary on a warm-paper canvas, with a single clay accent for warmth and "reach me" moments (on-call, mic, urgent). Sage green means *on shift*; amber means *due / reminder*. Backgrounds are the warm `#f3ebdd` paper; cards are a lighter warm `#fffaf2`. No cool greys anywhere — even the "neutrals" are warm (ink `#3a3128`, muted `#8a7a66`, line `#ece0cf`). See the **Colors** cards.
- **Type:** Bricolage Grotesque for display/headings/wordmark/**numbers** (it gives times and durations a friendly, slightly-condensed character); Figtree for all UI and body (clean, legible small). Display tracking is tight (`-0.01em`); body is relaxed (1.5 line-height). Eyebrows are 11px, weight 700, tracked `0.12em`, uppercase, muted.
- **Spacing & layout:** a 4px grid; generous, never cramped. Content maxes at ~768px (`max-w-3xl`) on phone/tablet. One-handed thumb-zone weighting — primary actions sit low and pinned (Finish shift). On Tablet A, a fixed identity rail on the left keeps the capture controls in the right (thumb-reachable) pane.
- **Shape / corners:** soft and rounded everywhere. Cards 16–22px; category tiles 20px; pills & avatars fully round (`999px`); inputs 16px. Nothing sharp.
- **Cards:** warm-paper surface, a 1px warm hairline border (`--border`), and a *very* low, warm-tinted shadow (`0 8px 28px rgb(30 34 42 / .07)`). Cards barely lift off the canvas — they feel like sheets of paper, not floating glass. A `flat` tone drops the shadow; `sunk` is a tinted inset well (segmented-control track); `brand` is a light-teal selected wash.
- **Shadows:** two soft levels only — `--shadow-soft` (hairline lift) and `--shadow-card` (the standard sheet). The one exception is the clay mic button, which gets a warm coloured glow (`--shadow-pop`) to invite the tap. No hard or black drop-shadows.
- **Backgrounds:** flat warm paper — **no gradients, no photographic hero imagery, no textures or patterns.** Calm and quiet by design. (Imagery, where it ever appears, would be warm-toned and gentle; the system currently uses none.)
- **Borders:** 1px, warm `#ece0cf` hairlines. Selected/active states swap the border to teal and fill with the light teal tint.
- **Hover:** gentle — backgrounds warm one step (surface → sunk; brand → brand-strong). No lifts, no scale-ups, no glow (except the mic).
- **Press / active:** colour deepens (teal → `--brand-strong`, clay → `--clay-strong`); no aggressive shrink.
- **Focus:** **always visible** — a 2px teal outline at 2px offset. Non-negotiable in a disability-support tool (keyboard / switch-access users).
- **Transparency & blur:** used sparingly to none. Surfaces are solid paper; the system favours opacity and warmth over glassmorphism.
- **Motion:** quiet. 0.15s ease colour transitions on interactive elements; the recording mic pulses softly. No bounces, no parallax, no decorative loops. Respect `prefers-reduced-motion`.
- **Accessibility intent:** ≥44px hit targets; calm/low-contrast urgency (reassurance over alarm); large legible type; one-handed thumb weighting.

---

## ICONOGRAPHY

Two deliberate icon languages — and **no emoji, ever.**

1. **"Paper" category icons** — the signature. Each log category is a soft **cut-paper blob** (one of three rotated organic shapes) in the category's tint, with a **stroked line glyph** in a darker ink of the same hue floating on top, plus a soft warm drop-shadow. Six categories only: **Food** (amber `#f6d99a`/`#8a5a18`), **Drink** (teal `#a9ddd7`/`#0e5e58`), **Hygiene** (periwinkle `#cdd6f0`/`#4d5b9e`), **Activity** (green `#aedcb6`/`#256b3f`), **Toilet** (aqua `#b9e0da`/`#14756a`), **Medication** (pink `#f3c2d8`/`#962f63`). *Note* uses voice/free-text and *Incident* its own calm button — neither gets a Paper icon. Shipped as `<PaperIcon>` and as SVGs in `assets/icons/paper-*.svg`. Tints live in `tokens/categories.css` (`--cat-*`).
2. **Thin line UI icons** — for chrome (home, notes, mic, clock, calendar, pin, phone). Single-weight outline, **1.8px stroke** (2.2px when emphasised/active), round caps and joins, drawn on a 24px grid, coloured `currentColor` (usually muted, or teal when active). These are inline SVGs in the components (no icon font, no third-party set). When you need more line icons, match this exact weight and style — or use **Lucide** (same outline language, free) and keep the stroke at 1.8px.
3. **Unicode** appears only as soft typographic separators: `·` (middot) and `–` (en-dash). The back affordance uses a literal `←`.

The logo mark ships as ready SVGs: `assets/logo/caira-mark-teal.svg`, `-white.svg`, `-clay.svg`, `-ink.svg`, and `caira-app-icon.svg`. Don't redraw the heart — reuse these or `<Logo>` / `<CairaMark>`.

---

## INDEX — what's in this project

**Foundations**
- `styles.css` — the single entry point (consumers link this). `@import`s everything below.
- `tokens/colors.css` · `categories.css` · `typography.css` · `spacing.css` · `shape.css` · `fonts.css`.
- `guidelines/*.card.html` — foundation specimen cards (Colors, Type, Spacing, Brand).

**Assets** (`assets/`)
- `logo/` — mark in teal/white/clay/ink + app icon.
- `icons/` — the six Paper category icons.

**Components** (React; `window.CairaDesignSystem_e5cfc1.<Name>`)
- `components/core/` — `Button`, `Card`, `Badge`, `Avatar`, `Input`.
- `components/navigation/` — `SegmentedControl`.
- `components/caira/` — `Logo` / `CairaMark`, `PaperIcon` (+ `PAPER_CATEGORIES`), `CategoryTile`, `OnCallButton`, `ContactRow`.
- Each has a `.d.ts` (props) and `.prompt.md` (what & when + example).

**UI kits** (`ui_kits/`)
- `phone/` — **Shift Tracker**, the worker's primary in-shift capture surface.
- `tablet/` — **Companion (Tablet A)**, single-participant in-shift, two-pane.

**Other**
- `SKILL.md` — Agent-Skills entry point (use this system from Claude Code).
- `screenshots/` — reference captures from the product repo.

---

## Using a component (in a `@dsCard` / standalone HTML)

```html
<link rel="stylesheet" href="styles.css">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" …></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" …></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" …></script>
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, CategoryTile, Logo } = window.CairaDesignSystem_e5cfc1;
  // …render
</script>
```

## Not yet designed (out of scope here, deferred in the source)
Settings + the 16-scheme palette switcher, web/coordinator dashboards, Tablet B (group home / central mic) & C, the urgent-takeover & reminders carousel, real incident-report flow, and finish-shift confirmation. These are intentionally **omitted** rather than invented — add them to `docs/design/` first if the brief grows.
