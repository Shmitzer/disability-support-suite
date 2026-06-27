# Caira — source of truth & workflow

Design source of truth = `docs/design/` (the `.dc.html` Design Components + `HANDOFF.md` + `screenshots/`).
The React app in `src/` is BUILT TO MATCH `docs/design/`. Never let a second design source exist.

## Roles
- `docs/design/` — design reference (the `.dc.html` prototypes, screenshots, HANDOFF.md). Owned by the design agent (cd).
- `src/` — the React/Next app, wired to live Supabase. Built to match docs/design/. Owned by Claude Code.

## Brand & design system (canonical)
- `Caira Wordmark.dc.html` — the **finalised "Mark-i" wordmark** (heart-mark = the dot of the *i*). Canonical brand asset.
- `Caira Logo.dc.html` — the **logo component** the app uses (`variant: lockup | mark`, `tone: teal | white`, `size`).
- `Caira Sales Site.dc.html` (+ `Feature Showcase.dc.html`) — the **marketing site** (default Direction B). Pre-launch: lock direction B, hide the switcher, wire CTAs, set real pricing.
- `design-system/` — "Sage & Clay" tokens (`tokens/` + `styles.css`), mirrored from `globals.css`. The new `.dc.html` files load these.

## When rebuilding a screen
Open the matching `docs/design/<Screen>.dc.html`, read `docs/design/HANDOFF.md` for tokens + interactions,
and rebuild as React in the app's own conventions. Match it pixel-for-structure. Do not invent UI.

## Tokens — "Sage & Clay" (default), mirror these in globals.css
primary #0f766e · accent #df5b40 · canvas #f3ebdd · surface #fffaf2 / #fffaf3 ·
ink #3a3128 · muted #8a7a66 · line #ece0cf · status #34a07f (bg #e7f1ec) · amber #e3a534 (bg #fdf6ea).
Fonts: Bricolage Grotesque (headings/wordmark/numbers) + Figtree (UI/body).
If HANDOFF.md changes a hex, update globals.css to match.
`design-system/tokens/` mirrors these. Reconciled 2026-06-26: all brand hexes match globals.css; `--amber` + a few warm-neutral variants are documented here but not yet in globals.css — add them when the amber/reminders UI is built.

## .dc.html files are reference, NOT production code
They use a Design-Component runtime (`<x-dc>` markup + a `class Component extends DCLogic` block + data-props JSON).

## Deferred — do NOT build (unless the brief changes)
urgent takeover, reminders carousel, group mic, contacts/on-call (visual mock only), Tablet B/C, web dashboards,
16-scheme palette/Settings, sync, real audio, incident flow.

## Status (26 Jun 2026)
Tablet A · phone capture flow rebuilt to match (Paper-icon tiles, Mic/Capture/Timeline tabs, voice mode), wired to
live Supabase. cd delivered the finalised wordmark, logo component, marketing site (Sales Site + Feature Showcase) and
the "Sage & Clay" design-system tokens — now landed here.
Next on `src/`: adopt the Mark-i wordmark via the shared logo component (nav/footer/mockups); reconcile the React landing
page to `Caira Sales Site.dc.html`; then dashboard + notes screens.
