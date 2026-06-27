# cd design brief — Restrictive-practice incident capture (speed-first)

**Written 2026-06-27 (Cowork).** A focused cd brief for the **restrictive-practice (RP) reportable
incident** flow — the highest-compliance, most speed-critical surface in the product. Slots in
**right after** the incident register cd already built (`Caira Incidents.dc.html`); it's the
"reportable" path specialised for RP. Author as a `.dc.html` on the Sage & Clay SSOT; data fields map
to `HUB_DATA_MODEL.md` §Restrictive-practice incidents so cc can wire it without guessing.

## Who / why

Zef (a.k.a. Zeph) — severe TBI, impaired impulse control, physical aggression; **authorised physical
and chemical restraint** under a behaviour support plan (BSP), 3:1 ratio. This screen is used **during
or immediately after** a restraint event, often one-handed, under stress, on the **shared hub iPad**.
So the binding constraint is **speed + calm**: minimum taps, everything pre-filled that can be,
nothing alarming. It is *not* a form to fill — it's a few confirmations.

## The two capture paths (both must reach save)

1. **Chips quick-entry** — tap the RP type from the participant's **BSP-authorised buttons**, confirm
   a couple of pre-set facts, done.
2. **AI dictation** — big mic, speak the narrative, live transcription, **editable review before
   save** (Rule 11). For when there's no time to tap.

Both converge on the same review-before-save confirmation.

## Flow

**0 · Entry + pre-filled context (zero taps).** Reached from the hub's loud *REPORT* affordance (calm
clay, not red). A context strip shows what's already known and needs no input: **Zef · now ·
[logging worker] · [capacity/org]** — pulled from the hub check-in.

**1 · RP type (one tap).** Large buttons for the participant's **BSP-authorised** practices only
(e.g. *Physical restraint*, *Chemical restraint*) — sourced from the care-profile, so the common case
is one tap. A visually distinct, lower-prominence **"Unauthorised / emergency use"** path for anything
outside the BSP — choosing it is the serious branch (see step 3).

**2 · Minimal per-type fields (pre-set chips, not free text where possible):**
- **Physical restraint:** duration (quick presets), what was happening / trigger, **less-restrictive
  strategies tried first** (chips), injury check (none / minor / needs first aid).
- **Chemical restraint:** drug + dose — ideally **picked from the eMAR** (links the
  `MedicationAdministration`), routine vs PRN, time.
- **Both:** immediate actions taken, current outcome / how Zef is now.

**3 · Authorised vs emergency — the fork that matters.**
- *Authorised under BSP* → fast confirm, recorded, calm.
- *Unauthorised / emergency* (`rpAuthorised=false`) → auto-flags **reportable**, shows the calm-clay
  **"reportable to the NDIS Commission, due within [reportingWindowHours]"** banner + a notifications
  checklist (coordinator auto-notified; guardian/nominee; Commission). Make this branch unmistakable
  but not panic-inducing.

**4 · Review before save.** Dictated or tapped, the worker sees the assembled record and edits before
committing. Then **confirmation** — reference number, status, and what-happens-next (including the
reporting deadline if reportable).

## Design constraints

- **Touch targets large**, reachable one-handed; the fewest taps to a saved authorised RP.
- **Tone: calm and non-judgmental.** This logs a restraint on a real person — dignity first. The one
  loud affordance is muted clay, never red. No alarm styling on the authorised path.
- **Tablet-first** (the shared iPad) with a phone layout too; Sage & Clay tokens throughout.
- Compose the DS bundle (Logo mark, Button, SegmentedControl, chips/quick-buttons). Reuse the
  register's status-tint language so this reads as the same family as `Caira Incidents.dc.html`.

## Props (tweakables in `data-props`)

- `participantName` (e.g. "Zef")
- `bspAuthorisedPractices` — the list driving the one-tap RP buttons (e.g. `["Physical restraint",
  "Chemical restraint"]`)
- `reportingWindowHours` (e.g. 24)
- `initialMode` — `"quick"` | `"dictate"`

## Data mapping (for cc wiring — from `HUB_DATA_MODEL.md`)

Screen field → `Incident` column: RP type → `rpType`; authorised toggle → `rpAuthorised` (false
auto-sets `reportable=true`); routine/PRN → `rpRoutineOrPrn`; drug/dose → `rpMedication`/`rpDose`
(+ `medicationAdminId` when picked from eMAR); duration → `rpDurationMinutes`; strategies tried →
`lessRestrictiveTried`; BSP ref → `bspReference`; narrative → `description` + `immediateAction`;
notifications checklist → `notified` JSON. Always `restrictivePractice=true`.

## Guardrails

Dummy data only until the legal gate clears. `docs/design/` is the SSOT — commit the `.dc.html` +
screenshot + a `HANDOFF.md` entry so cc can wire it. **Do not** treat any RP reporting timeframe or
obligation shown here as legally settled — the lawyer + behaviour support practitioner confirm those
(see `PARTICIPANT_HUB_SPEC.md` §lawyer) before the trial logs a real RP event.
