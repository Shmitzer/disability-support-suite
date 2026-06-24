# DSW App — Build Command Centre

**Single source of truth for build status.** Maintained by Claude Code in the repo
(version-controlled, updated every session). The *strategic* command centre (vision /
MRR / calendar) stays on Google Drive; this is the technical half.

- **Repo:** github.com/Shmitzer/disability-support-suite (note: *Shmitzer*, no first "c")
- **Working branch:** `claude/phase-e-auth` → open **PR #2**
- **Last updated:** 2026-06-24 (RLS live + app-layer tenant isolation)

---

## Status snapshot

| | |
|---|---|
| **Branch / PR** | `claude/phase-e-auth` · PR #2 · latest commit `606124c` |
| **Just finished** | **Phase F — all slices code-complete** (health, Stripe billing, observability/email, photos→Storage) + tests + CI + a security fix |
| **Verified** | `tsc` ✓ · `lint` ✓ · `npm test` (25/25) ✓ · `build` ✓ — all **headless** (no live DB/keys in the sandbox) |
| **Next up** | Laptop: apply DB (migrate + RLS/auth SQL), wire integration keys, deploy, smoke-test. See `docs/PHASE_F.md` + `docs/PRODUCTION_CUTOVER.md` |
| **Gate status** | Pre-real-user gate NOT fully met — RLS **live-applied + verified** ✓; rate limiting (needs Upstash keys), privacy policy (final copy/legal), right-to-erasure still outstanding |

---

## Phase plan (letters, as embedded in code)

- [x] **A** — schema hardening (multi-tenant cols, Worker/Org/AuditLog, roles)
- [x] **B** — sectorConfig label maps + identity/sector seam (Rule 4)
- [x] **C** — PII scrub (Rule 2) + output validation/fallback (Rule 11) + idempotency (12) + local backup (8)
- [x] **D** — SQLite → Postgres cutover. Code-complete; **tested live on Supabase** (aws-1, :6543)
- [x] **E** — Supabase magic-link auth + RLS. Code-complete:
  - Step 1 (auth/middleware/Worker provisioning) — **tested live**
  - Step 2 (tenant columns stamped, `userId` NOT NULL, RLS + auth-hook SQL) — **code-complete, live SQL apply pending**
  - Step 4 (`DEV_AUTH` sandbox bypass, hard-gated off in prod) — done
- [x] **F** — go-live integrations. **Code-complete, inert without keys:**
  - `/api/health` uptime probe (live now, no config)
  - Stripe billing — plumbing + `/billing` UI + signature-verified webhook → AuditLog + PostHog/Sentry + transactional emails + **server-side admin check**
  - Observability/email — Sentry, PostHog, Resend (all env-gated)
  - Photos → Supabase Storage — relative paths (Rule 3) + signed URLs; inline data-URL fallback when no bucket
  - Tests (25, `npm test`/`npm run test:db`) + CI (`.github/workflows/ci.yml`) + `prisma/sql/schema_baseline.sql`

---

## Pre-real-user gate (ALL must be true before the first real user)

- [x] Postgres migration (Phase D — live on Supabase)
- [x] Real auth — Supabase magic-link (Phase E Step 1)
- [x] RLS hardened via JWT claims — **APPLIED LIVE + cross-tenant verified** (Supabase, all 6 `verify_rls_editor.sql` checks pass). Fixes found during apply: restore API-role grants after `--force-reset`, guard `_prisma_migrations` for `db push`, and tightened `WITH CHECK` to block cross-tenant insert/reassign
- [x] PII scrubbing (Phase C, Rule 2)
- [~] Rate limiting + hard spend cap — **throttle scaffolded** (`src/lib/rate-limit.ts`, Upstash REST, on `/api/generate-note`, fail-open, inert without keys). Needs Upstash keys live; hard spend cap still provider-side (AI Studio budget)
- [x] Graceful LLM fallback + output validation (Phase C, Rule 11)
- [x] `/api/health` (Phase F — **done**)
- [~] Privacy policy — **placeholder route live** (`/privacy`); final copy + legal review (Privacy Act / NDIS) pending
- [x] Landing page + waitlist — **public marketing page live at `/`** (dashboard moved to `/dashboard`; signed-in users auto-redirect there) **with working waitlist capture** (`WaitlistSignup` table, `joinWaitlist` action, deny-by-default RLS). Placeholder copy/branding still to refine
- [ ] `anonymiseUser()` right-to-erasure (needs full NDIS Participant fields first)

---

## What's left — needs YOUR laptop / credentials

Full detail in **`docs/PHASE_F.md`** (go-live) and **`docs/PRODUCTION_CUTOVER.md`** (D/E).

1. **DB (laptop):** `prisma migrate dev --name init` (or paste `prisma/sql/schema_baseline.sql`), then `search_vector.sql` → `auth_hook.sql` (+ enable the hook in the dashboard) → `rls_policies.sql`.
2. **Credentials:** Stripe (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`) · a **private** `shift-photos` bucket · `RESEND_API_KEY` · `NEXT_PUBLIC_POSTHOG_KEY` · `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`.
3. **Deploy** to Vercel.
4. **Smoke tests:** `npm run test:db` · RLS BOLA test (org-A can't read org-B) · Stripe subscribe→portal→cancel · photo add/reload/edit (stores paths, not base64).

**Decisions to lock:** Stripe plan (price/interval/trial) · `EMAIL_FROM` + sending domain · which of Sentry/PostHog/Resend to enable at launch.

---

## Schema — done vs deferred

**Done (Postgres):** multi-tenant columns; Organisation (incl. `stripeCustomerId`, `subscriptionStatus`); Worker/User (`supabaseUserId @unique`); AuditLog (now **written** via `recordAudit()`); ShiftReport metadata + approval flow; idempotency on Shift + LogEntry.

**Deferred:** full NDIS Participant fields; soft-delete (`deletedAt`/`anonymisedAt`); FeatureFlag table; pgcrypto; `billingCycle` + `stripeSubscriptionId` on Organisation; `anonymiseUser()`. NOTE: `activitiesLog`/`incidentFields` exist but aren't populated by app code yet.

---

## The 12 architectural rules — never break

1. No LLM calls outside `src/lib/ai.ts`
2. No PII to any external API (scrub first) — *Phase C*
3. No absolute file paths in the DB (relative only) — *Phase F: photos store relative Storage paths*
4. No hardcoded sector terminology in JSX (sectorConfig) — *Phase B*
5. No hardcoded single-tenancy (`organisationId` nullable) — *Phase A*
6. No SQLite in production — *Phase D live*
7. No auth shortcuts (Supabase Auth + JWT-hardened middleware) — *Phase E*
8. No form submit without local-state backup — *Phase C*
9. No sensitive action without an AuditLog entry — *Phase F: `recordAudit()` writes billing events; expand to roster/report actions*
10. No new table without `userId` + `organisationId?` — *Phase A/E*
11. No LLM output shown without validation (check, retry, fallback) — *Phase C*
12. No shift mutation without an idempotency key — *Phase C*

---

## Decision log (newest first)

- **2026-06-24** — **App-layer tenant isolation (the other half of RLS).** Audit found that because Prisma bypasses RLS (Option A), the app's own reads/admin-rechecks scoped by *worker identity* but **not by organisation** — latent cross-tenant/IDOR risks that activate with a 2nd real org (admins reading other orgs' shifts/participants/notes; `/api/generate-note` and `/shift/[id]` by id; unscoped roster/notes list reads). Added `tenantScope(worker)` next to `tenantOwner` and applied it to all 6 findings (generate-note, shift page, roster-actions allocate/offer/cancel/create, clock-actions approve/reject, roster.ts + notes/dashboard list reads, quick-shift). Helper unit-tested. No behaviour change for the current single-org/solo setup. **Deferred (finding #7, design call):** `LearnedOption` picklists are global across orgs — the schema calls it a "shared global picklist", but RLS scopes it; decide whether picklists should be per-org before multi-org launch. tsc/lint/build green, 34 tests.
- **2026-06-24** — **RLS APPLIED LIVE + verified (milestone).** Live Supabase cutover on Windows via `prisma db push --force-reset` (CLI reads `DIRECT_URL` via `prisma.config.ts`; SQL run through the Supabase SQL Editor, no psql). All 6 cross-tenant checks pass. Three real fixes surfaced during apply: (1) `--force-reset` drops/recreates schema `public`, stripping Supabase API-role grants → added `prisma/sql/grant_api_roles.sql` (cutover step E0); (2) `rls_policies.sql` errored on `_prisma_migrations` (not created by `db push`), which rolled back the whole script and left RLS OFF → guarded with `to_regclass`; (3) `WITH CHECK` was `own OR org`, allowing a Data-API caller to plant a row they own into another org → added `AND (org IS NULL OR org = claim)` on the data-table/Worker/AuditLog policies. App unaffected throughout (writes via Prisma, bypasses RLS). Remaining for RLS: live JWT/auth-hook smoke test (sign in → token carries top-level `organisationId`).
- **2026-06-23** — **RLS audit + automated cross-tenant check.** Reviewed `rls_policies.sql` / `auth_hook.sql` / `backfill_tenant.sql` — design is sound (Option A, `WITH CHECK` blocks tenant reassignment, signed top-level org claim, append-only AuditLog). Added `prisma/sql/verify_rls.sql` (+ `npm run verify:rls`): a deterministic BOLA check that injects `request.jwt.claims` for two simulated orgs/users and asserts no cross-tenant read, anon deny-by-default, `WITH CHECK` blocks cross-tenant insert, cross-tenant UPDATE hits 0 rows, and **every `public` table has RLS enabled** (regression guard for new tables). Runs in a rolled-back transaction. The live apply + run is still laptop-gated (no live Postgres in the sandbox). Minor flags logged for the cutover: global `LearnedOption` rows are invisible to the Data API under RLS (fine — app reads via Prisma); intra-org RBAC is app-layer, not RLS.
- **2026-06-23** — **Waitlist capture.** Added `WaitlistSignup` (non-tenant, unique email) to the schema + `schema_baseline.sql`; `joinWaitlist` server action (`waitlist-actions.ts`) with the pure helpers split into `waitlist.ts`; `WaitlistForm` (useActionState) on the landing hero; deny-by-default RLS (enable-RLS-no-policy, like `_prisma_migrations`) since the table holds raw emails and the Prisma role bypasses RLS to insert. Duplicate signup is treated as success (no email-enumeration leak). 30 tests pass. NOTE: no admin UI yet — read signups via the Supabase table editor / a query until one exists.
- **2026-06-23** — **Landing page.** Took the routing fork: dashboard moved `/` → `/dashboard`; `/` is now a public marketing landing (sector-aware copy via sectorLabels, Rule 4). Signed-in users auto-redirect to `/dashboard` (skipped under DEV_AUTH so the sandbox can preview). Updated post-login redirect, BottomNav home tab, the three back-links, and the auth public-path allowlist (`/`, `/privacy`). Copy/branding are placeholder; waitlist/trial not yet wired. `tsc`/`lint`/`build` green, 27 tests pass.
- **2026-06-23** — **Phase 0 gate, headless slice.** Knocked out the items that don't need the laptop: rate-limit throttle on the LLM endpoint (Upstash REST, dependency-free, fail-open, no-op without keys) + `/privacy` placeholder route. Health endpoint confirmed already done (Phase F). RLS left for the credentialed session (needs live Postgres — can't be exercised on the sandbox's SQLite). `tsc`/`lint`/`build` green, 27 tests pass.
- **2026-06-23** — **Phase F complete (code).** Health probe; Stripe billing (plumbing + `/billing` UI + webhook→AuditLog + analytics + transactional emails); Sentry/PostHog/Resend; photos→Supabase Storage (relative paths + signed URLs, inline fallback); 25 tests; CI; phone-pasteable `schema_baseline.sql`. **Security review** caught + fixed a HIGH issue: billing server actions enforced admin in the UI only — now re-checked server-side (`isRosteringRole`). Also Phase E Steps 2 & 4 landed (tenant stamping + `userId` NOT NULL + RLS/auth-hook SQL; `DEV_AUTH`).
- **2026-06-23** — Phase E Step 1 live & tested (magic-link auth end-to-end; middleware; Worker provisioning; Postgres live aws-1:6543; seed data).
- **2026-06-22** — Phase D cutover verified pre-run.
- **2026-06-21** — Reconciled with repo main; Phase A–F letter plan; GitHub handle is "Shmitzer".
- **2026-06-21** — Command Centre created.

---

## Reference

- `docs/PHASE_F.md` — per-integration go-live checklist (env vars, dashboard setup, smoke tests)
- `docs/PRODUCTION_CUTOVER.md` — Phase D/E runbook (DB migrate + RLS/auth apply order)
- `docs/ACCESS_CONTROL.md` · `AGENTS.md` · `CLAUDE.md`
- Drive (strategy, phone-first): "Edward's Command Center — DSW App" (vision / MRR / calendar) + the daily "RIGHT NOW" one-liner the briefing reads.
