# Caira — Developer Handoff

Front-end design prototype for **Caira**, a disability-support shift-logging app. Source of truth for visuals/interactions. Build target: the existing Next.js repo (`disability-support-suite`).

## Files
- `Caira Tracker.dc.html` — **phone** Quick-Capture (older interaction model; see "Sync gap").
- `Caira Tablet & Web.dc.html` — **canvas** holding all responsive layouts:
  - **Tablet A · Companion** — single participant, in-shift (the most complete screen).
  - **Tablet B · Today board** — group home / multi-client, central "record a message" mic.
  - **Tablet C · Capture + live timeline** — side-by-side logging + history.
  - **Web A · Coordinator dashboard**, **Web B · Participant record**, **Web C · Reports**.
- `Caira Logo Final.dc.html` — logo system (lockups, app icons, colourways).

### Marketing site (new — same brand, separate from the product app)
- `Caira Home.dc.html` — **Shift-Tracker-led landing page** (1200px). Hero with live phone mock, "accessible by design" strip, "behind every log is a person" mission band, feature rows (quick capture / voice notes), stat band, roadmap teaser, testimonial, pricing peek ($9/worker), final CTA, footer. Tweak prop `showRoadmap` (boolean). **GTM strategy: lead with Shift Tracker, earn trust, introduce modules later** — the page reflects this (modules shown as "Soon").
- `Caira Modules.dc.html` — **module gallery + Shift Tracker detail** (1200px). Six-module grid (Shift Tracker = Available now; Incident Reporting, Medication, Messaging & On-call, Coordinator Dashboard, Reporting & Compliance = Soon), "one connected record" flow band, "Inside Shift Tracker" feature cards, CTA. Module icons are drawn via `React.createElement` in the logic class — fine to render, but rebuild as normal SVG markup in React.
- `Caira Site Wireframe.dc.html` — low-fi structure for Home + Pricing + Module flow (reference only; Home & Modules are the hi-fi successors). Pricing page is still wireframe — not yet designed in full brand.
- Palette/logo exploration files (`Caira *.dc.html`) — reference only.

> `.dc.html` files are Design Components: markup in `<x-dc>`, logic in the `class Component extends DCLogic` block, tweak props in the `data-props` JSON. Treat them as design reference, not production code — rebuild as React components.

## Brand
**Fonts:** Bricolage Grotesque (headings, wordmark, numbers) · Figtree (UI + body).
**Logo:** solid heart with a "C" carved into the upper-left lobe, opening tilted up (~−18°). Teal on light, white on teal tiles. SVG in `Caira Logo Final.dc.html`.

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
