# cc start prompt — Phase G **G2 wire-up** (logic / backend / wiring)

Paste this to a fresh Claude Code session. You are **cc** — the logic/backend/wiring role. **cd** owns
design in `docs/design/` (the SSOT). Read `docs/COMMAND_CENTRE.md` on `main` (canonical status),
`docs/HUB_DATA_MODEL.md`, and **`docs/design/HANDOFF.md`** (the G2 section — screen specs + the RP
field→`Incident` column map) before starting.

**Mission:** wire the **five committed G2 design screens** into real App-Router routes in `src/`,
against the **live hub backend that's already on `main`** — driving to an NLS soft-trial on dummy data.
No real participant data.

---

## ✅ Already done (don't redo)

- **G0 consolidation** + **hub backend slice** are merged to `main` (`b955b8c`): `src/lib/hub.ts`
  (capacity→funding routing, entry stamping, scrypt PIN, RP-reportable derivation, participant channel),
  `hub-actions.ts` (device trust, participant-anchored session lifecycle, N concurrent PIN-gated
  check-ins, idempotent `logHubEntry`, consent-gated `participantHubTimeline`), `hub-realtime.ts`,
  and `incident-actions.ts` (RP fields). 183 tests green at merge.
- **DB applied live** (Supabase SQL Editor): `prisma/sql/hub.sql` + `restrictive_practice.sql`;
  `verify_rls_editor.sql` → ALL RLS CHECKS PASSED. Schema (`HubDevice/HubSession/HubCheckIn`, `LogEntry`
  hub cols + nullable `shiftId`, `Worker.pinHash/pinSetAt`, `Incident` RP cols) is **live**.
- **Site is live** on **www.caira.net.au** (marketing public, `/login` magic-link, `/dashboard`
  `@caira`-allowlisted). `AUTH_ALLOWLIST` set in prod.
- **cd's 5 screens are committed** to `docs/design/` (`1b82a12`) — so wiring is **unblocked**.

## 🎯 Build: G2 wire-up (per screen, in cd's delivery order)

Each screen is a Sage & Clay DC in `docs/design/` (with screenshots + a HANDOFF.md entry). Build each as
a **real App-Router TSX route** in `src/` (no standalone `.jsx`), matching the `.dc.html` design exactly,
using the Sage & Clay tokens in `src/app/globals.css`, wired to the live backend actions above:

1. **`Caira Participant Hub.dc.html`** (tablet) → participant-anchored hub: open/resume `HubSession`,
   the on-shift avatar row → tap-to-identify → **PIN sheet** → capacity pick (worker/family/guardian) →
   active actor; quick-log tiles call `logHubEntry` (stamps `loggedByWorkerId`+`actingCapacity`+org);
   the unified **cross-org timeline** via `participantHubTimeline` (consent-gated); **presence + realtime**
   via `hub-realtime.ts`; **lock** clears the actor (shared-device safeguard).
2. **`Caira RP Incident.dc.html`** (tablet) → restrictive-practice capture → `reportIncident` with the RP
   fields. **Use the field→`Incident` column map in `docs/design/HANDOFF.md`** (rpType, rpAuthorised→
   auto-`reportable`, drug/dose+`medicationAdminId`, duration, lessRestrictiveTried, bspReference, …).
3. **`Caira Incidents.dc.html`** (phone) → incident register + reportable form; "Restrictive practice"
   deep-links the RP screen. `reportingWindowHours` is a tweak (NOT legally settled — see caveats).
4. **`Caira Notifications.dc.html`** (phone) → in-app feed + push-permission priming sheet (in-app only;
   web-push deferred — needs VAPID = Edward).
5. **`Caira eMAR.dc.html`** (phone) → eMAR-lite (due/given/withheld/refused/PRN); chemical-restraint PRN
   cross-references the RP flow (`medicationAdminId`).

*(cd's `/console` coordinator desktop + state pages 404/500/offline are NOT designed yet — wire them only
after cd commits those `.dc.html`.)*

## 🏠 Also: make the Sales Site the live landing page

The live `/` is still a placeholder. Rebuild **`src/app/(public)/page.tsx`** to match **`docs/design/Caira Sales Site.dc.html` → Direction B (the *teal* scheme)** — it's the locked landing design (`initialDirection=B`). Ship it with the dev **switcher hidden** (`showSwitcher=false`), public (no auth), signed-in users still redirect to `/dashboard`. Sage & Clay tokens in `globals.css`; reuse the shipped `<Logo>`/`<CairaMark>`. Keep the waitlist CTA + `/login` link.

## 🌱 Also: land the expanded seed (cw-prepped)

`_seed_expanded/seed.ts` (in the repo root, untracked) is a drop-in for `prisma/seed.ts` — one account per
Role (DEV_AUTH role-switch) + the hub capacities (Zef + Linda's family/guardian grants + WORKER/FAMILY/
GUARDIAN check-ins). **cw prepped it but couldn't run gates** — verify (`tsc`/`lint`/`test`/`build`),
`npx tsx prisma/seed.ts` against a dev DB (prereq: `hub.sql` applied), then commit + push. Details in
`_seed_expanded/SEED_HANDOFF_cc.md`.

## ✅ Definition of done per task

`tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓ · any new schema as **unapplied**
`prisma/sql/*.sql` (never `db push`) · graceful degradation if a table/column is absent · commit ·
update `COMMAND_CENTRE.md` decision log · push to `main` (re-fetch `origin/main` first;
**never commit/push from the mounted repo — clean clone + laptop push**, per `CW_PREFLIGHT.md`).

## ⛔ Edward-gated — never autonomous

Apply SQL to the live DB · rotate the DB password · VAPID / Stripe / Resend / Upstash / Sentry / PostHog
keys · `AUTH_ALLOWLIST` value · Vercel/deploy/domains · engage the lawyer · author `caira.riv`.
**Real RP reporting obligations + the 24h window are NOT legally settled** — lawyer + behaviour-support
practitioner confirm before any real RP event. **Dummy data only** until legal clears.

## 🔭 Parallel track — Medication verification + authorisation (design-independent parts can start)

Spec: **`docs/MED_VERIFICATION_SPEC.md`** (locked 2026-06-27; **legal-gated, dummy data only**). cd designs the screens in parallel — wire those only **after** cd commits the `.dc.html`. You CAN start the **design-independent backend** now:
- The hard-gated **authorisation state machine** `DRAFT→PENDING_BSP→PENDING_COMMISSION→PENDING_GUARDIAN→ACTIVE` — enforced at the **DB/enum level, not the UI** (a direct write must not be able to skip a gate).
- **Medication / PillAppearanceProfile / MARLog** schema as **unapplied `prisma/sql`** — appearance as **structured fields** (not free-text), `source = INTERNAL` now / `MIMS` later; MARLog + authorisation chain **immutable**.
- **Claude-Vision verification behind `src/lib/ai.ts`** — send the *expected med profile only* (**scrub PII**: no participant name/NDIS number), the **app** decides the outcome, **low confidence → mismatch (fail-safe)**, never auto-proceed. Chemical-restraint admin links the existing `Incident` RP fields via `medicationAdminId`.

## Guardrails

The 12 architectural rules (`COMMAND_CENTRE.md`) — especially: all LLM calls behind `src/lib/ai.ts`;
no PII to any external API (scrub first); no new table without `userId`+`organisationId?` **and** an RLS
`tenant_isolation` policy; no LLM output shown without validation; no shift/entry mutation without an
idempotency key. cc wires a screen only **after** cd has committed its design (done for these 5).
