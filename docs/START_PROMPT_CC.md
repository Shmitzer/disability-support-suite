# cc start prompt — Phase G (logic / backend / wiring)

Paste this to a fresh Claude Code session. You are **cc** — the logic/backend/wiring role. Your
counterpart **cd** owns design in `docs/design/` (the SSOT). Read `docs/COMMAND_CENTRE.md` on
`main` (canonical build status) and `docs/NEXT_PHASE_G_PLAN.md` before starting.

**Mission:** consolidate the three stranded backend branches into one green `main`, then wire the
screens cd designs — driving to an NLS soft-trial on dummy data. No real participant data.

---

## ✅ DECISIONS LOCKED (2026-06-27 — defaults accepted, build immediately)

No need to stop and ask — these are decided. Proceed on them.

1. **Branch consolidation** — merge all three into `main`, verifying green after each, in order:
   `serene-feynman-p80kpr` (Phase 0) → `pensive-allen-md8h6h` (Phase 1.6) → `elegant-davinci-551vkd`
   (Phase 2 cores).
2. **Domain / login allowlist** — canonical = **both**: `caira.app` for the app, `caira.net.au`
   for AU marketing. Update `AUTH_ALLOWLIST` + `test/allowlist.test.ts` to include **both** domains.
3. **eMAR scope** — **lite**: due / given / withheld / refused / PRN. (Full chart deferred.)
4. **Notifications at trial** — **in-app only**. Email + web-push deferred (web-push needs VAPID = Edward).
5. **Incident register** — include the **NDIS reportable-incident** fields/flow. It's core to NLS.
6. **Billing** — **defer Stripe entirely** until post-trial (trial is dummy-data).
7. **NDIA price-guide file** — **defer**: ship the importer with **no seed data** (Edward names the
   version later).
8. **SCHADS** — ship the engine with `DEFAULT_SCHADS_CONFIG` clearly marked **UNVERIFIED**; Edward
   verifies against the live MA000100 guide later.
9. **LearnedOption picklists** — **no change**: keep global seeds + per-org overrides (already built).
10. **`anonymiseUser()` erasure** — **land it now** (on `pensive-allen`; closes the last gate item).
11. **Participant Hub** — build it in Phase G (shared iPad for Zef's 3:1 multi-org support). First
    user = his mother: **one identity, three capacities** — Solo Worker (own org) +
    `participant_guardian` (`consent:manage`) + `family_carer_clinical` on Zef. **Capacity captured
    per entry** (`actingCapacity`). Full slice in **`docs/HUB_DATA_MODEL.md`** + `PARTICIPANT_HUB_SPEC.md`.
12. **Hub specifics (locked 2026-06-27):**
    - **Build scope = all** — hub + RP + the simpler G2 screens, in parallel. No staging.
    - **Device auth** — full login once per worker, then **PIN tap**; persist a hashed `pinHash` on
      `Worker`. **AI assists** identification (context: who's checked in/rostered; voice hints during
      dictation) but the actor is **always confirmed** — never AI-auto-committed (audit integrity).
      **Voiceprint biometrics deferred** (lawyer sign-off first).
    - **Data controller = each org controls its own entries.** No single controller; the cross-org
      timeline is a `authorizeParticipantAccess`-gated read-across of independently-owned rows (matches
      per-row `organisationId`). Drop any "nominee-as-controller" wiring.
    - **Restrictive practices = full build now** on dummy data. Extend `Incident` per
      `HUB_DATA_MODEL.md` §Restrictive-practice (`rpType`, `rpAuthorised`→auto-`reportable`,
      drug/dose + `medicationAdminId` eMAR link, duration, `lessRestrictiveTried`, `bspReference`).
      The global no-real-data gate already covers real RP events.
    - **Multi-device real-time sync** — personal phones + the shared iPad are clients of the **same
      participant-anchored session**. Supabase Realtime broadcast (keyed by participant) + presence
      keep them live-consistent; every write carries an `idempotencyKey` and goes through the
      `offline-sync` outbox, so retries / same-event-from-two-devices can't double-write. See
      `HUB_DATA_MODEL.md` §Real-time multi-device sync.

---

## Build order

**G0 — Consolidate (do first).** For EACH branch, in order
`serene-feynman-p80kpr` → `pensive-allen-md8h6h` → `elegant-davinci-551vkd`:
fresh-clone or worktree → `npm install` → `npx prisma generate` →
`npx tsc --noEmit` + `npm run lint` + `npm test` + `npm run build` green →
merge to `main` (re-fetch `origin/main` immediately before) → push. Resolve the
`rbac.ts` / `schema_baseline.sql` / `prisma/sql/` overlaps deliberately; re-verify green after
each merge. **Then** produce **one ordered idempotent SQL apply script** (`prisma/sql/apply_phase_g.sql`)
covering everything still unapplied — Caira (`caira_ai.sql`, `org_caira_enabled.sql`,
`caira_flag_rls.sql`), Phase 0 (`apply_all_features.sql` + `feature_tables_rls.sql`), 1.6
(erasure/NDIS), 2.4 (`ndis_price_guide.sql`) — in dependency order, with a dry-run note. ⛔ Edward applies it.

**G2 — Wire-up (per screen, after cd commits the `.dc.html`).** Build each as a real route in
`src/` wired to the live backend, in cd's delivery order: **Participant Hub** → incident register +
reportable form → notification center + push-permission prompt → eMAR-lite → `/console` coordinator
desktop → system/state pages. New screens become real App-Router TSX routes (no standalone `.jsx`),
using the Sage & Clay tokens in `src/app/globals.css`.

**Hub backend slice (per `PARTICIPANT_HUB_SPEC.md`).** Hub session model (participant+device
anchored, N concurrent worker check-ins, check-in/out, auto-lock/timeout); per-entry
`actingCapacity` (worker | family | guardian) + `actorWorkerId` + org + shiftId, PIN-gated identify,
idempotency intact, audited; cross-org timeline read model merging consented orgs onto Zef's
timeline (RLS `tenant_isolation` still per owning org); device registration/trust. Unapplied
`prisma/sql`; graceful degradation.

**Definition of done per task:** `tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓ · new
schema as **unapplied** `prisma/sql/*.sql` (never `db push`) · graceful degradation if the
table/column is absent · commit · update `COMMAND_CENTRE.md` decision log + push to `main`.

## ⛔ Edward-gated — never do these autonomously

Apply SQL to the live DB · rotate the DB password · VAPID / Stripe / Resend / Upstash / Sentry /
PostHog keys · `AUTH_ALLOWLIST` value · nominate the NDIA price-guide file · deploy/Vercel · engage
the lawyer · author `caira.riv`. (You may *edit* `AUTH_ALLOWLIST` parsing/tests to accept both
domains — Edward sets the actual env value.)

## Guardrails

The 12 architectural rules (`COMMAND_CENTRE.md`) — especially: all LLM calls behind
`src/lib/ai.ts`; no PII to any external API (scrub first); no new table without
`userId`+`organisationId?` **and** an RLS `tenant_isolation` policy; no LLM output shown without
validation; no shift mutation without an idempotency key. Dummy data only. cc wires a screen only
**after** cd has committed its design.
