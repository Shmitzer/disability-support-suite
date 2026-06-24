# Caira design — source of truth

This folder is the **canonical reference for Caira's visual design and layout.** The
React components in `src/` are built to **match** what's here. When the design changes,
it changes **here first**, then the components are rebuilt — don't restyle ad-hoc in the
components and let them drift from the design.

## What lives here
- `HANDOFF.md` — the written spec: brand, "Sage & Clay" palette, log categories,
  Paper-icon tints, and the key interactions (Tablet A is the reference model).
- `*.dc.html` — the **Design Components** (the actual prototypes). Markup in `<x-dc>`,
  logic in the `class Component extends DCLogic` block, props in the `data-props` JSON.
  These are **design reference, not production code** — rebuild them as React components.
  Canonical screen for the phone capture flow: **Tablet A · Companion**.
- `screenshots/` — rendered references to match against.

## How a screen gets built
1. Read the relevant `.dc.html` (structure, spacing, components, states) + screenshot.
2. Rebuild it as a React component that **matches the layout**, wired to the existing
   server actions (`addLogEntry`, `clockOff`, the AI note flow, etc.) — design fidelity
   on top of the real backend, not a recolor of the old layout.
3. Use the tokens in `src/app/globals.css` (the `--brand`/`--clay`/`--surface`/… vars,
   already set from this spec) so colours stay centralised.

## In scope vs deferred (per the build brief)
- **In scope (phone):** capture chip grid (8 categories, Paper tints) → chip-detail
  panel + Type-swap → Finish shift → existing AI note.
- **Deferred — do NOT build:** urgent takeover, reminders carousel, group mic,
  contacts/on-call, Tablet B/C, web dashboards, 16-scheme palette/Settings, sync,
  real audio, incident flow, logo work.

## Status
As of this commit the app is **re-skinned** to the Sage & Clay tokens but the screen
**layouts still follow the original app**, not the `.dc.html` designs — because the
`.dc.html` files were not yet in the repo. Add them here and the screens get rebuilt to
match, starting with Tablet A.
