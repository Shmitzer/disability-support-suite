# Command Centre — handover & status

Single source of truth for picking the project back up. Last updated end of the
Phase F build session (2026-06-23).

---

## Snapshot

| | |
|---|---|
| **Working branch** | `claude/phase-e-auth` (open PR #2) |
| **Latest commit** | `fd7c92c` — enforce admin role on billing actions |
| **Tree** | clean, pushed |
| **Verified** | `tsc` ✓ · `npm run lint` ✓ · `npm test` (25/25) ✓ · `npm run build` ✓ — all **headless**; no live DB/keys in the sandbox |
| **Runbooks** | `docs/PHASE_F.md` (go-live checklist) · `docs/PRODUCTION_CUTOVER.md` (Phase D/E DB+auth) |

> Everything credential-gated is **inert without keys** — the app builds and runs unchanged until you wire each integration.

---

## Status by phase

- **Phase D (SQLite → Postgres):** code-complete. Live: apply schema + verify.
- **Phase E (Supabase Auth + RLS):** code-complete (auth, route groups, tenant stamping, RLS/auth-hook SQL, `DEV_AUTH`). Live: run auth-hook + RLS SQL, smoke-test.
- **Phase F (go-live integrations):** all code-complete this session —
  - ✅ `/api/health` uptime probe (live now, no config)
  - ✅ Stripe billing — plumbing + `/billing` UI + webhook→AuditLog + analytics + transactional emails + **server-side admin check**
  - ✅ Observability/email — Sentry, PostHog, Resend (env-gated)
  - ✅ Photos → Supabase Storage (relative paths + signed URLs; inline fallback)
  - ✅ Tests (25) + CI (`.github/workflows/ci.yml`) + phone-pasteable schema SQL

---

## What's left — all needs YOUR laptop / credentials

### A. Stand up the database (laptop)
Per `docs/PRODUCTION_CUTOVER.md`. With `.env` pointed at Supabase:
```bash
npx prisma migrate dev --name init          # baseline (or paste prisma/sql/schema_baseline.sql)
psql "$DIRECT_URL" -f prisma/sql/search_vector.sql
psql "$DIRECT_URL" -f prisma/sql/auth_hook.sql      # then enable the hook in the dashboard
psql "$DIRECT_URL" -f prisma/sql/rls_policies.sql   # after auth_hook
```

### B. Wire credentials (env vars)
Names + dashboard setup are in `docs/PHASE_F.md`. Summary:
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (+ create product/price + webhook endpoint)
- **Storage:** create a **private** `shift-photos` bucket (uses `SUPABASE_SERVICE_ROLE_KEY`)
- **Email/analytics/errors:** `RESEND_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`

### C. Deploy (Vercel) — Phase F pointer

### D. Smoke tests (after A–C)
- `npm run test:db` — photo round-trip against real Postgres (rolls back; leaves no data)
- RLS BOLA test: org-A user cannot read an org-B row id
- Stripe: subscribe with a test card → `/billing` shows **Active** → AuditLog row → cancel via portal
- Photos: add on a live shift → reload renders → `LogEntry.photos` holds **paths**, not base64 → edit keeps + adds without loss

---

## Decisions to lock (no code needed — just decide)
- **Stripe plan:** price, interval, trial length → drives the product/price in the dashboard
- **`EMAIL_FROM`** address + sending domain (Resend domain verification needs DNS)
- Which of Sentry / PostHog / Resend you actually want on at launch

---

## Resume-on-laptop sequence (TL;DR)
1. `git fetch && git checkout claude/phase-e-auth && git pull`
2. `npm ci && npx prisma generate`
3. Create `.env` from `.env.example` with Supabase + integration keys
4. Do **A** (DB) → **B** (creds) → **D** (smoke tests) → **C** (deploy)
5. Review/merge PR #2 once CI is green

---

## Security note (this session)
A review caught one **HIGH** issue, already fixed (`fd7c92c`): the billing server
actions (`startCheckout`/`openBillingPortal`) enforced admin access in the UI only;
a non-admin org member could have invoked the Stripe Billing Portal directly (cancel
the subscription, view invoices). Now re-checked server-side with `isRosteringRole`.
Everything else in the review (photo IDOR/traversal, auth-gate matcher, DEV_AUTH
gating, webhook signature, RLS/auth-hook) was checked and cleared.

---

## Watch-outs
- Photo Storage cutover is **gated on `storageConfigured()`** — verified only via the
  inline fallback headless. Run the **D** photo smoke-test once the bucket exists.
- `prisma/sql/schema_baseline.sql` is a convenience baseline; it does **not** create
  Prisma migration history — prefer `prisma migrate dev` for the real cutover.
- `DEV_AUTH=1` is sandbox-only and hard-gated off in production builds.
