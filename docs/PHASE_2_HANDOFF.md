# Phase 2 — Handoff (cc → cd + Edward)

**Session:** 2026-06-26 · **Branch:** `claude/elegant-davinci-551vkd` · **Role:** cc (backend/logic).
Decision-log entries for all of the below are canonical on `main` (`docs/COMMAND_CENTRE.md`).

This session built every Phase 2 item that's cleanly cc-startable **headless** — no design, no
`node_modules`, no first-revenue gate. Each is a **pure, unit-tested logic core**; the env/design-
gated wiring around it is listed as the explicit next step. **4 cores, 30/30 tests green** via `tsx`.

> Sandbox caveat (unchanged): `node_modules` is network-gated here, so `tsc/lint/build` can't run —
> pure cores are verified with `tsx`. Server actions + new Prisma models type-check/build on the
> laptop after `prisma generate`.

---

## What cc built (done)

| Phase | Core (pure, tested) | Wired into |
|---|---|---|
| **2.4** Budgets/claims + NDIS price guide | `src/lib/price-guide.ts` (NDIA CSV importer, per-region caps, over-cap validation), `toNdisBulkCsv()` in `src/lib/billing-claims.ts` (real 16-col NDIA bulk template) | `src/lib/billing-claims-actions.ts` → `importPriceGuide()`, `checkClaimAgainstGuide()` |
| **2.2** Offline / PWA + sync | `src/lib/offline-sync.ts` (outbox: enqueue, per-entity-serialised drain, retry/backoff, reconcile, summarise) | — (binding deferred, see below) |
| **2.5** SCHADS award interpretation | `src/lib/schads.ts` (day penalties, overtime split, shift loadings higher-of, casual loading, allowances) | — (config + roster wiring deferred) |

New schema + unapplied SQL: `NdisSupportItem` model + `prisma/sql/ndis_price_guide.sql`.

---

## → For cd (design — unblocks the rest of Phase 2)

These are blocked **only** by design-SSOT (cd designs `.dc.html` + screenshots + `HANDOFF.md` first;
cc then wires `src/` to match):

1. **2.1 `/portal`** — participant + family/guardian surface: read-only care feed, family med/routine
   submit, documents, consent step. (Gated by the legal consent model too.)
2. **2.3 Messaging + shift handover** screens.
3. **Offline UI states (2.2)** — the `pending / syncing / synced / failed` badges + an "offline,
   queued" affordance. The state machine already exists (`summarise()` in `offline-sync.ts`);
   cd designs how it surfaces.
4. **Budgets/claims UI (2.4)** — budget burn-down view + claim-export screen + a price-guide
   import/override admin screen. Logic is ready (`billing-claims-actions.ts`).

---

## → For Edward (ops / credentials / verification)

**Apply (by hand in Supabase SQL editor — NOT `db push`):**
1. `prisma/sql/ndis_price_guide.sql`, then add `"NdisSupportItem"` to `prisma/sql/schema_baseline.sql`
   and re-run `verify_rls.sql` (the all-tables-have-RLS guard).

**Decisions / data to supply:**
2. **NDIA price guide** — confirm which Support Catalogue file/version to import (no public API;
   periodic spreadsheet). Load it via `parsePriceGuideCsv` → org rows.
3. **SCHADS rates** — verify/replace `DEFAULT_SCHADS_CONFIG` in `src/lib/schads.ts` against the
   current Fair Work **MA000100** pay guide (defaults are marked UNVERIFIED; rates changed +3.5%
   on 2025-07). The engine structure is correct; only the numbers need confirming.

**Laptop session (needs `node_modules` + live browser — env-gated here):**
4. **2.2 service-worker half** — add `@serwist/next` (SW: app-shell precache + read caching +
   offline fallback ONLY — do **not** cache/replay server-action POSTs; they're RSC-encoded with
   build-varying action IDs), a web manifest, the **IndexedDB binding** that persists the
   `offline-sync` outbox, and a **route-handler replay mirror** for the few offline-able writes so
   Background Sync can drain without the tab open. Server idempotency for replay is already done.
5. **2.5 enterprise integrations** — SSO, Xero/payroll, NDIS report/PDF packs, white-label tier:
   real third-party integrations + after-first-revenue per the plan sequence.
6. Run `tsc/lint/build/test` green on the laptop after `prisma generate`.

---

## Suggested next cc work (no design / no deps needed)

- **Track L (legal drafts)** — scope the legal brief + draft privacy/ToS/DPA/consent starting points;
  wire ToS/DPA/consent acceptance logging to `ParticipantAccessGrant` + `Consent`. Parallel,
  cc-startable now, no design dependency.

*Sources: `docs/IMPLEMENTATION_PLAN_MVP.md`, `docs/COMMAND_CENTRE.md` decision log (2026-06-26).*
