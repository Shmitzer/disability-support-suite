# Caira — Developer Handoff

Front-end design prototype for **Caira**, a disability-support shift-logging app. Source of truth for visuals/interactions. Build target: the existing Next.js repo (`disability-support-suite`).

## Files
- `Caira Tracker.dc.html` — **phone** Quick-Capture (older interaction model; see "Sync gap").
- `Caira Tablet & Web.dc.html` — **canvas** holding all responsive layouts:
  - **Tablet A · Companion** — single participant, in-shift (the most complete screen).
  - **Tablet B · Today board** — group home / multi-client, central "record a message" mic.
  - **Tablet C · Capture + live timeline** — side-by-side logging + history.
  - **Web A · Coordinator dashboard**, **Web B · Participant record**, **Web C · Reports**.
- `Caira Logo Final.dc.html` — earlier logo exploration (lockups, app icons, colourways). Superseded as the brand mark by `Caira Wordmark.dc.html` (below); kept for reference.

### Brand assets (finalised by cd, 2026-06-25)
- `Caira Wordmark.dc.html` — **the finalised wordmark.** Concept: the **"Mark-i"** — the heart-with-carved-C mark *is* the dot (tittle) of the `i` in "Caira", so the wordmark carries the brand symbol inside itself. Bricolage Grotesque 800, i-stem matched to the letter weight, optically-centred spacing. Includes standalone, reversed-on-teal/ink, horizontal + stacked lockups, small-size tests, and a Tweaks panel (`markScale` / `stemWeight` / `iSpace` / `tracking`). **This is the canonical brand asset.**
- `Caira Logo.dc.html` — **the logo component the live app uses** (nav / footer / phone mockups). Props: `variant` (`lockup` | `mark`), `tone` (`teal` | `white`), `size`. Renders the Mark-i wordmark, or the heart mark alone for spots that need just the symbol.
- `design-system/` — the **"Sage & Clay" design-system tokens** (`tokens/` colors · typography · fonts · spacing · shape · categories, plus `styles.css`, `README.md`, manifest). Mirrors `src/app/globals.css`. The new `.dc.html` files load these tokens.

### Marketing site (now real — same brand, separate from the product app)

> **Status (updated 2026-06-26):** the marketing site now exists as a committed prototype.
> - `Caira Sales Site.dc.html` — **the marketing site** (live default **Direction B**: human copy in a bold teal layout). Responsive, on-brand, finalised wordmark in nav + footer, auto-cycling hero feature showcase, editor-controlled Promotions. Tweaks: `initialDirection` (A/B/C), `showSwitcher`, `showPromos`, and `promo1–3` (tag/title/detail); body/heading copy + single colours edit inline.
> - `Feature Showcase.dc.html` — the auto-cycling hero feature card embedded in the sales site.
> - **Left to finish for launch:** set real pricing (placeholder by design); flip `showSwitcher` **off** and lock `initialDirection` to B; point the "Start free trial" CTAs at a real signup/waitlist URL. A and C directions remain behind the switcher as alternates.
> - `mockups/caira-home.html` and `src/app/(public)/page.tsx` remain the earlier landing-page artifacts; reconcile the React landing page to the new sales site when rebuilding `src/`.
> - The **Modules** gallery and a dedicated **Pricing** page are still only specs (below), not yet prototyped.

**Intended `Caira Home` (landing) spec** — Shift-Tracker-led landing page (1200px). Hero with live phone mock, "accessible by design" strip, "behind every log is a person" mission band, feature rows (quick capture / voice notes), stat band, roadmap teaser, testimonial, pricing peek ($9/worker), final CTA, footer. **GTM strategy: lead with Shift Tracker, earn trust, introduce modules later** — modules shown as "Soon".

**Intended `Caira Modules` spec** — module gallery + Shift Tracker detail (1200px). Six-module grid (Shift Tracker = Available now; Incident Reporting, Medication, Messaging & On-call, Coordinator Dashboard, Reporting & Compliance = Soon), "one connected record" flow band, "Inside Shift Tracker" feature cards, CTA. *Not yet prototyped or built.*

**Intended Pricing page** — low-fi only; plans + FAQ + CTA. *Not yet designed in full brand.*

- Palette/logo exploration files (`Caira Logo *.dc.html`, `Caira Icons.dc.html`, `Caira Warm Schemes.dc.html`, etc.) and the `Caira Tracker Wireframe.dc.html` — reference only; restored from the original bundle and now present in this folder.

> `.dc.html` files are Design Components: markup in `<x-dc>`, logic in the `class Component extends DCLogic` block, tweak props in the `data-props` JSON. Treat them as design reference, not production code — rebuild as React components.

## Brand
**Fonts:** Bricolage Grotesque (headings, wordmark, numbers) · Figtree (UI + body).
**Logo / wordmark:** solid heart with a "C" carved into the upper-left lobe, opening tilted up (~−18°). Teal on light, white on teal tiles. The mark doubles as the dot of the `i` in the **"Mark-i" wordmark** (`Caira Wordmark.dc.html`). Use `Caira Logo.dc.html` (`variant: lockup | mark`) in product; `Caira Logo Final.dc.html` is the older exploration.

## Palette — "Sage & Clay" (default)
| Token | Hex | Use |
|---|---|---|
| primary | `#0f766e` | teal — actions, brand |
| accent | `#df5b40` | clay — on-call, mic, urgent |
| canvas | `#f3ebdd` | app background |
| surface | `#fffaf2` / `#fffaf3` | cards, headers |
| ink | `#3a3128` | text |
| muted | `#8a7a66` | secondary text |
| line | `#ece0cf` | borders |
| status (on) | `#34a07f` / bg `#e7f1ec` | "on shift" |
| due/amber | `#e3a534` / bg `#fdf6ea` | reminders, meds-due |

The phone tracker also ships a **16-scheme palette system** (Warm/Cool/Electric/Classic × masc/fem) intended to live in a user Settings screen; all surface/ink/border/accent derive from the chosen scheme (see `schemes()` + `mix()` in `Caira Tracker.dc.html`).

> **Tokens vs `globals.css` (reconciled 2026-06-26):** every brand hex above matches `src/app/globals.css` exactly — `design-system/tokens/` mirrors it. The only tokens cd documents that `globals.css` does **not yet define**: `--amber #e3a534` / `--amber-bg #fdf6ea` (meds-due / reminders) and a few warm-neutral variants (`--surface-2 #fffaf3`, `--surface-sunk/sunk #efe6d6`, `--text-faint #9b8a72`). Add these to `globals.css` when the amber/reminders UI is built in `src/`.

## Log categories (match repo)
Food, Drink, Hygiene, Activity, Toilet, Medication (+ Note, Incident). Icons are **"Paper" style**: a soft cut-paper blob fill + a stroked line glyph, per-category tint. Tints: Food `#f6d99a`/`#8a5a18`, Drink `#a9ddd7`/`#0e5e58`, Hygiene `#cdd6f0`/`#4d5b9e`, Activity `#aedcb6`/`#256b3f`, Toilet `#b9e0da`/`#14756a`, Medication `#f3c2d8`/`#962f63`.

## Key interactions (Tablet A is the reference model)
- **Capture grid** — square category chips. Tapping a chip **replaces the grid** with a detailed note panel (quick-options, amount/level, note, save). Panel options are placeholder scaffolds — fill per category.
- **Record / Type** — a big "Record a voice note" button + a "type" icon that **swaps the chip space for a free-text box**.
- **Urgent notifications** — when one is active it **takes over the capture area** and requires acknowledgement. Two kinds: *medication* (Confirm received → clears) and *coordinator message* (admin-frozen: worker confirms → "Awaiting acknowledgement" colour state, re-prompts admin every 2 min; admin can freeze until they ack; default is clear-on-worker-ack). Internally scrolls so it never overflows.
- **Reminders carousel** — time-based, cycled with up/down arrows; lead warnings (medication 5-min; outing 1-hour + 30-min; etc.); **unread count badge**.
- **Key contacts** — locked list with phone numbers; **On-call** one-tap call button.
- **Finish shift** — pinned action.
- **Tablet B** — one central mic records a message for the whole house, then **confirms which client** it's about (recipient picker; flags when no name detected).

## Tweakable props (`data-props` on `Caira Tablet & Web.dc.html`)
- `urgentDemo` (boolean, default false) — show the urgent-notification takeover. **Default is the normal chip view**; urgent only appears when true.
- `urgentType` (enum: `message` | `medication`).
- `houseName` (text) — group screen title.

## Status / caveats for whoever builds this
- **All actions are mocks** — Save / Confirm / Clear / Quick-log / On-call / Finish currently no-op or just close. No persistence, no backend, no real audio/transcription.
- **Sync gap:** the phone `Caira Tracker` still uses the *older* model (mic-in-toggle, no urgent takeover, no reminders/alerts). Bring it in line with Tablet A if the phone is in scope.
- **Not yet designed:** Settings screen (layout + palette switcher), real incident-report flow, finish-shift confirmation, and alerts/voice-message on the Web dashboards.
- Accessibility intent: large hit targets (≥44px), calm/low-contrast urgency (reassurance over alarm), one-handed thumb-zone weighting on phone/Tablet A.


## Phase G / G2 screens (added 2026-06-27 by cd)


### Participant Hub — shared iPad (G2 — added 2026-06-27 by cd)

- `Caira Participant Hub.dc.html` — **tablet** participant-anchored "care station" for Zef's 3:1
  multi-org support (built to `PARTICIPANT_HUB_SPEC.md` + `HUB_DATA_MODEL.md`). Three columns:
  **identity** (Zef care context, BSP, on-call), **capture** (on-shift avatar row + quick-log),
  **shared timeline** (right). Flow: **tap-to-identify** — tap your photo in the "on shift now" row
  → **PIN sheet** (full login once, then a PIN tap; AI may pre-highlight the likely worker but the
  actor always confirms) → if capacity is ambiguous (the mother, Linda Mercer = worker *or* family)
  a **capacity pick** sheet appears → you become the active actor ("Logging as …"). **Quick-log**
  tiles (the six Paper category icons + Note + the clay *Report incident* → links the incident
  register) stamp each entry with `loggedByWorkerId` + `actingCapacity` + org. The **unified
  timeline** merges all orgs' entries, each attributed *name · capacity badge · org* (Worker=teal,
  Family=amber, Guardian=clay), with a live **presence cue** ("Aria is adding a note…") for the
  real-time multi-device model. **Lock** clears the actor → a **locked overlay** (shared-device
  safeguard) requires tap-to-identify again; the hub session stays open for Zef. Tweak:
  `participantName`. Capacity → funding: WORKER = billable/EVV via shift; FAMILY/GUARDIAN = unpaid
  (per `HUB_DATA_MODEL` capacity routing).

### eMAR-lite (G2 — added 2026-06-27 by cd)

- `Caira eMAR.dc.html` — **phone** medication record, the **compact card/row list** (not a full
  chart grid, per decision 6). Sections: **Due now** (amber, with Give / Withhold / Refused —
  Withhold & Refused expand an inline reason picker), **Later today** (upcoming, scheduled time),
  **PRN — as needed** (Give PRN), **Done** (given / withheld / refused with who · when · reason).
  Chemical-restraint PRN (Lorazepam) carries a clay note and, once given, the
  "also logs as a restrictive practice" cross-reference deep-linking the RP flow (per
  `HUB_DATA_MODEL`: chemical restraint via eMAR must surface as RP). Tweak: `participantName`.

### Notification center (G2 — added 2026-06-27 by cd)

- `Caira Notifications.dc.html` — **phone** notification **feed + push-permission priming sheet**
  (worker surface). Feed groups **New** (unread, teal dot) vs **Earlier** (read, dimmed); tapping a
  row marks it read (moves to Earlier, decrements the clay unread badge); **Mark all read** clears.
  Notification kinds carry calm per-type tints + line icons: coordinator **message** (teal),
  **medication** due (meds pink), **reminder**/outing (amber), reportable **incident** (clay),
  **shift** (sage), **on-call** (clay). The **push-permission prime** is a two-step soft-ask: an
  inline primer card ("Turn on" / "Not now") opens a bottom **priming sheet** that explains *why*
  before the OS prompt (meds & reminders / messages & on-call / reporting deadlines) — Allow →
  "Notifications are on" strip; "Not now" dismisses without nagging. Calm, never marketing.
  The phone surface is a fixed-height (844px) internal-scroll container so the sheet pins to the
  visible bottom. Tweak: `participantName`.

### Incident reporting (G2 — added 2026-06-27 by cd)

- `Caira Incidents.dc.html` — **phone** incident **register + reportable-incident form** (worker
  surface). The list shows this-shift incidents with calm status tints (Reportable = clay,
  Open = amber, Recorded = sage) and a filter (All / Open / Reportable); the one deliberately-loud
  **"REPORT AN INCIDENT"** affordance is the brand's muted-clay uppercase treatment — **never red**.
  Create flow: pick incident type → (auto-detects reportable from type or "Serious" severity, showing
  the calm-clay 24h Commission banner) → when, what happened, immediate-action chips, anyone-present,
  and a notifications checklist (coordinator auto-notified; guardian/nominee; Commission) → save →
  confirmation with reference + status. Selecting **Restrictive practice** routes out to the
  specialised RP flow (deep-links `Caira RP Incident.dc.html`) rather than capturing it here.
  Tapping a list row opens a read-only detail. Tweaks: `participantName`, `reportingWindowHours`.

- `Caira RP Incident.dc.html` — **tablet** (shared hub iPad) **restrictive-practice capture**, the
  speed-first "reportable" path that slots in right after the register. Built to
  `docs/RP_INCIDENT_CD_BRIEF.md` + `HUB_DATA_MODEL.md §Restrictive-practice incidents`. Left rail =
  pre-filled context (participant, BSP-0417, on-shift worker + capacity + org, PIN-confirmed note,
  live "this record so far" summary); right pane = capture. Two paths converge on one
  review-before-save: **Quick tap** (BSP-authorised one-tap buttons → pre-set chips) and **Dictate**
  (clay mic with recording pulse → editable transcript). The fork: *authorised under BSP* → calm
  confirm; *Unauthorised / emergency* (`rpAuthorised=false`) → auto-flags reportable, shows the
  calm-clay Commission banner + notifications checklist. Chemical restraint picks drug/dose from the
  **eMAR** (carries `medicationAdminId`). Calm clay throughout, never red. Tweaks: `participantName`,
  `bspAuthorisedPractices`, `reportingWindowHours`, `initialMode` (quick | dictate).

**Field → `Incident` column map (for cc wiring, RP screen):** RP type → `rpType`; authorised toggle
→ `rpAuthorised` (false ⇒ `reportable=true`); routine/PRN → `rpRoutineOrPrn`; drug/dose →
`rpMedication`/`rpDose` (+ `medicationAdminId` from eMAR); duration → `rpDurationMinutes`; strategies
tried → `lessRestrictiveTried`; BSP ref → `bspReference`; narrative → `description` +
`immediateAction`; notifications → `notified` JSON; always `restrictivePractice=true`.

**Caveats:** all actions are mocks (no persistence/backend/real transcription — the mic fills a sample
transcript). The reportable timeframe shown (`reportingWindowHours`, default 24h) is **not legally
settled** — the lawyer + behaviour-support practitioner confirm RP reporting obligations before any
real RP event is logged. Dummy data only.
