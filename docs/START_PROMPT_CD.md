> ## ▶ OVERNIGHT MODE — 2026-06-28 (read this first)
>
> You are **cd**. Run on branch **`claude/cd-enterprise`**. Your work list is the **cd queue** in
> **`docs/OVERNIGHT_PLAN_2026-06-28.md`** — follow its **resume protocol**: author each screen as a
> `.dc.html` in `docs/design/` + a `HANDOFF.md` entry, then **commit + tick the box in the plan +
> push your branch** (SSOT-first, so cc can wire it). On any restart, `git fetch`, re-read the plan,
> and work the **first non-`[x]` cd item** (never redo `[x]`). Hard rules + Edward-gated list are in
> the plan. The notes below remain your design reference.
>
> **Kickoff (paste to start):** "You are cd, on branch `claude/cd-enterprise`. Open
> `docs/OVERNIGHT_PLAN_2026-06-28.md`, find the first non-done item in the cd queue, and work it per
> the resume protocol — commit `.dc.html` + HANDOFF, tick+push after each, mark `[!]` and move on if blocked."

---

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
9. **Participant Hub leads the order** — shared iPad for Zef's 3:1 multi-org support; it's the
   trial wedge (first user = his mother). Full brief in **`docs/PARTICIPANT_HUB_SPEC.md`**.
10. **Hub + RP specifics (locked 2026-06-27):**
    - **Build scope = all** — design the hub, the restrictive-practice screen, AND the simpler
      worker screens in parallel.
    - **Device sign-in UI** — full login once per worker, then an **avatar row + PIN tap** to switch
      actor; the hub may **pre-highlight the likely worker** (who's checked in / voice hint) but the
      worker always taps to confirm. No biometrics UI.
    - **Restrictive-practice screen** — design it now per **`docs/RP_INCIDENT_CD_BRIEF.md`**:
      speed-first, BSP-authorised quick-buttons, AI-dictation path, authorised-vs-emergency fork,
      review-before-save. Calm clay, never red — it logs a restraint on a real person.
    - **Timeline** — shows every attendee's entries attributed (name · org · capacity); each org
      owns its own rows (no single shared record). Design it to **update live** as entries arrive
      from any device (phone or iPad), with a presence cue ("Aria is adding a note…") so two people
      don't log the same event.

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

## Parallel track — Medication verification + authorisation (now, in parallel)

Per **`docs/MED_VERIFICATION_SPEC.md`** (locked 2026-06-27). Design these alongside the order above; SSOT-first (commit `.dc.html` + HANDOFF before cc wires). **Legal-gated, dummy data only.**

- **Med-admin + visual verification** (worker, mobile) — extends eMAR-lite: in-app **photo capture** of the prepared pills → **match** (green, proceed, photo auto-logged) vs **mismatch / low-confidence** (red, expected-vs-seen, **override requires a typed or dictated reason** — never one-tap). AI is decision-support, calm not alarmist, never auto-proceeds.
- **Authorisation status + draft** (coordinator/admin, in `/console`) — make the `DRAFT → PENDING_BSP → PENDING_COMMISSION → PENDING_GUARDIAN → ACTIVE` chain visible: per-stage status, BSP + Commission reference capture, the immutable audit trail. **Workers see nothing until ACTIVE.**
- **Guardian/family review + confirm** (part of `/portal` — keep **flag-off / legal-gated skeleton**): plain-language plan review (no clinical jargon), confirm/decline with a recorded reason. Read + confirm only.

Pill-appearance is **structured fields** (colour/shape/size/markings) at med setup — never a free-text blob — so the future MIMS reference maps cleanly.

## Guardrails

`docs/design/` is the SSOT — design changes here **first**, then `src/` matches. No standalone
render-outside-the-app components (new screens become real routes for cc to build). `/portal`
(participant + family/guardian) and any social/game surfaces stay **flag-off / legal-gated** —
skeleton only until legal review. Dummy data only in every mock.
