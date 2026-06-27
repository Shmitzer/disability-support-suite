# cd start prompt — Phase G (design / `docs/design/`)

Paste this to a fresh Claude Code session. You are **cd** — the design role. `docs/design/` is the
**single source of truth** for layout and visual design; you author `.dc.html` prototypes +
screenshots + update `docs/design/HANDOFF.md`. Your counterpart **cc** rebuilds `src/` to match —
but only **after** you commit a design. Read `docs/design/HANDOFF.md`, `docs/design/README.md`
(Sage & Clay), and `docs/NEXT_PHASE_G_PLAN.md` before starting.

**Mission:** close the design gaps so the shipped-but-undesigned product surfaces become real
screens for the NLS trial — mobile-first worker screens first, then the coordinator desktop.

---

## ✅ DECISIONS LOCKED (2026-06-27 — defaults accepted, design immediately)

No need to stop and ask — these are decided. Proceed on them.

1. **Surface priority** — incident register + reportable form → notification center + push prompt →
   eMAR-lite → `/console` coordinator desktop → state pages (404/500/offline) → Modules + Pricing.
2. **`/console` before `/portal`** — coordinator desktop first; `/portal` (participant + family)
   stays **legal-gated, skeleton only**.
3. **Sales site** — lock **Direction B**: hide the dev switcher, set `initialDirection=B`, leave
   the CTA URL as a prop.
4. **Modules + Pricing pages** — **after the trial** (focus on product surfaces first).
5. **Caira creature in-app** — ship the **current clay cutout** (`caira-master.png`) across the new
   screens; higher-res render is later polish.
6. **eMAR visual depth** — **compact card/row list** (due/given/withheld/refused/PRN), not a full
   medication-chart grid.
7. **Incident form** — design the full **NDIS reportable-incident** field set.
8. **`/console` density** — **information-dense data tables + side nav** (desktop direction, distinct
   from the airy mobile worker aesthetic).
9. **Participant Hub leads the order** — shared tablet for Zef's 3:1 multi-org support; it's the
   trial wedge (first user = his mother). Full brief in **`docs/PARTICIPANT_HUB_SPEC.md`**.

---

## Design order

Author each as a `.dc.html` Design Component in `docs/design/` + a screenshot, then update
`HANDOFF.md` and commit so cc can wire it. Mobile-first for worker screens; desktop for `/console`.

1. **Participant Hub (shared tablet)** — participant-anchored "care station" for Zef's 3:1
   multi-org support. "Who's on shift now" avatar row; tap-to-identify + quick-unlock PIN sheet;
   capacity pick (worker / family) where ambiguous; unified multi-org timeline with unmistakable
   per-entry attribution (name · org · capacity); check-in/out + auto-lock states; shared-device
   privacy treatment. Tablet layout, distinct from the phone worker app and `/console`. Full brief
   in **`docs/PARTICIPANT_HUB_SPEC.md`**.
2. **Incident register + reportable-incident form** (worker, mobile) — list + create; NDIS
   reportable fields; the one deliberately-loud *REPORT AN INCIDENT* affordance (calm muted clay,
   not red).
3. **Notification center + push-permission prompt** (worker, mobile) — feed, read/unread, the
   permission-priming sheet.
4. **eMAR-lite** (worker, mobile) — due / given / withheld / refused / PRN actions (compact list).
5. **`/console` coordinator desktop** — dashboard, participant record + NDIS plan, roster,
   incidents, reports, org settings, documents (dense tables + side nav).
6. **System / state pages** — `not-found` (404), `error` (500), offline/PWA fallback.

(Modules + Pricing deferred — see decision 4.)

Keep design tokens centralised: if a hex/spacing changes, update the `design-system/` tokens **and**
mirror into `src/app/globals.css` (don't let them drift). Reuse the shipped logo SVGs / `<Logo>` /
`<CairaMark>` — don't redraw the heart. Sentence-case everything readable; UPPERCASE only for tiny
tracked eyebrows.

## Guardrails

`docs/design/` is the SSOT — design changes here **first**, then `src/` matches. No standalone
render-outside-the-app components (new screens become real routes for cc to build). `/portal`
(participant + family/guardian) and any social/game surfaces stay **flag-off / legal-gated** —
skeleton only until legal review. Dummy data only in every mock.
