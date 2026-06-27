# Handover to Cowork — Phase 1 cc backend (2026-06-26)

**From:** cc (Claude Code, web session) · **Branch:** `claude/pensive-allen-md8h6h` (pushed)
**Re:** Phase 1.6 backend slices of `docs/IMPLEMENTATION_PLAN_MVP.md`.

---

## Done (committed + pushed to `claude/pensive-allen-md8h6h`)

1. **`90e9ed4` — Participant right-to-erasure + NDIS plan fields (§1.6)**
   - `src/lib/anonymise.ts` — pure de-identification logic (label from id not name,
     identifier-field clears, whole-word name redaction). 6 unit tests, green via `tsx`.
   - `src/lib/participant-erasure-actions.ts` — `anonymiseParticipant()`: admin-only
     (`Capability.ParticipantErase`), tenant-scoped, idempotent, redacts retained
     `ProgressNote` bodies + tombstones the record in one txn, audited (Rule 9).
   - `prisma/schema.prisma` + `schema_baseline.sql` — full NDIS plan/profile fields on
     `Participant` (preferred name, DOB, contact/emergency/GP, plan dates + management,
     support coordinator) + `anonymisedAt`/`deletedAt`. Additive, all nullable.
   - `prisma/sql/participant_ndis_erasure.sql` — by-hand additive migration
     (`ADD COLUMN IF NOT EXISTS`), **NOT auto-applied** (repo convention).
   - `rbac.ts` — new `ParticipantErase` capability, granted to ADMIN.
   - Records are retention-bound (~7yr NDIS) → erasure de-identifies, never hard-deletes.

2. **`fc12193` — SUPERADMIN platform override into legacy gates (§1.6)**
   - The legacy `can(role, capability)` form (most server-action gates) checked
     `ROLE_CAPABILITIES.SUPERADMIN` (empty) → the platform seat was denied everywhere.
   - Now the SUPERADMIN role short-circuits to `true` in the legacy form too, mirroring
     the Principal-form `platformAdmin` override. All legacy gates honour it, no per-site
     changes. rbac tests 12/12 green via `tsx`.

This completes **both backend halves of §1.6** (erasure + NDIS fields; platform override).

---

## For Edward / Cowork (gated — needs laptop/credentials)

- [ ] **Apply the erasure migration** before the erasure *write* works (read paths tolerate
      absence): `psql "$DIRECT_URL" -f prisma/sql/participant_ndis_erasure.sql`, then re-run
      `verify_rls_editor.sql`. Safe to re-run; purely additive.
- [ ] **Run a real `tsc/lint/build`** on a credentialed machine. The web sandbox can't —
      Prisma's engine download is network-gated, so `npm ci` won't complete. Pure logic was
      verified with a standalone `tsx`; the two server actions need a real build to confirm
      against the generated Prisma client.
- [ ] **MFA + audit the SUPERADMIN seat** at sign-in (ops; the override is now live in code) —
      never the default login (Phase 0.5 / plan §2).

---

## Blocked on `cd` (design-SSOT — do NOT build these screens before design lands)

- §1.1 worker-app screen wiring · §1.2 `/console` surface · §1.3 incident/eMAR/credentials
  UIs · §1.4 consent banner + AI disclaimer placement · the `/platform` SUPERADMIN **UI route**.
- The design SSOT (`docs/design/`) currently only holds logos/icons/tracker — none of these
  screens are designed yet.
- §1.5 Stripe — additionally gated on the Pricing track delivering numbers.

---

## ⚠️ Repo state flag — `main` is stale/divergent in the web environment

When attempting the usual ccu-to-`main`, this environment's `main` was found to still carry
the **original SQLite single-tenant schema** and **does not contain `docs/COMMAND_CENTRE.md`**.
All real work lives on feature branches that were never actually merged, despite command-centre
"merged to main" notes. Per Edward's call this session, **ccu was skipped** and nothing was
pushed to `main`. **Reconcile `main` vs the feature-branch lineage before relying on it** — and
once reconciled, fold this handover into `docs/COMMAND_CENTRE.md` on `main`.
