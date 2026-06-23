# Production Cutover Runbook — Phases D & E

This is the step-by-step for the **credential-gated** phases that can't run in the
sandbox: migrating SQLite → Supabase Postgres (Phase D) and turning on Supabase
Auth + Row-Level Security (Phase E). Run these from a machine that has the Supabase
project credentials. Each step says whether it's a **code edit** (safe to prepare
ahead) or a **live action** (needs the database/credentials).

The SQLite working branches (`main`, `claude/hopeful-mccarthy-g4nvef`) stay intact
so Phase 1 keeps running. The **code edits for Phase D (steps D1–D2 below) are
already applied on branch `claude/phase0-supabase-migration`** — schema provider,
native enums, `Json` columns, the pg driver adapter, and the seed/CLI wiring. What
remains on that branch is the **live** work: point it at Supabase and run the
migration. Verified headless there (schema valid, client generates, `tsc` passes);
the first run against real Postgres is the true test.

---

## Prerequisites (live)

1. Create a Supabase project in **ap-southeast-2 (Sydney)** for AU data residency.
2. Collect: the Postgres connection string, the project URL, the `anon` key, and
   the `service_role` key.
3. Put them in `.env` locally (never commit — `.env` is gitignored):
   ```
   DATABASE_URL="postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://…@…supabase.com:5432/postgres"   # for migrations
   NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="…"
   SUPABASE_SERVICE_ROLE_KEY="…"
   GEMINI_API_KEY="…"
   ```

---

## Phase D — SQLite → Postgres

### D1. Schema provider + enums (code edit)
In `prisma/schema.prisma`:
- `datasource db` → `provider = "postgresql"`, `url = env("DATABASE_URL")`,
  `directUrl = env("DIRECT_URL")`.
- Convert the string fields to native enums and add the types:
  ```prisma
  enum Role        { SOLO_WORKER WORKER SUPERVISOR ADMIN PARTICIPANT SUPERADMIN }
  enum SectorMode  { NDIS AGED_CARE MENTAL_HEALTH COMMUNITY_SERVICES EARLY_CHILDHOOD }
  ```
  Point `Worker.role` at `Role` and `Organisation.sectorMode` at `SectorMode`.
  (Status fields like `Shift.status` can stay strings or become enums too — your call.)
- Change `Json`-shaped columns currently stored as `String?` (`ShiftReport.activitiesLog`,
  `incidentFields`, `AuditLog.detail`) to `Json?` now that the DB supports it.
- Make `userId` **NOT NULL** on data tables (the DB is reseeded against real users,
  so there's no dummy-row backfill problem — this was the reason it was nullable on
  SQLite; see the roadmap's "foundational ordering" note).

### D2. Adapter swap (code edit)
In `src/lib/prisma.ts`, replace `@prisma/adapter-better-sqlite3` with the Postgres
driver (`@prisma/adapter-pg` + `pg`, or the Supabase pooler). Update `package.json`.

### D3. Reset the migration history to a Postgres baseline (live)
`migration_lock.toml` is provider-pinned, so the SQLite migrations don't carry over:
```bash
rm -rf prisma/migrations            # SQLite history; safe — they only ever built dev.db
npx prisma migrate dev --name init  # one clean Postgres baseline
```

### D4. Full-text search (live)
```bash
psql "$DIRECT_URL" -f prisma/sql/search_vector.sql
```

### D5. Seed or start empty (live)
- Demo/staging: `npx tsx prisma/seed.ts` (drop the dummy `LogEntry.photos`
  base64 data — real photos move to Supabase Storage in Phase F).
- Production: start empty; do **not** seed dummy data.

### D6. Verify (live)
`npx prisma migrate status` clean · enums + `searchVector` exist (`\d "ShiftReport"`)
· `npm run build` · app boots and reads/writes against Postgres.

---

## Phase E — Supabase Auth + RLS

### E1. JWT org claim (live)
Install the **Custom Access Token hook** that looks up the user's `organisationId`
from `Worker` and injects it as a **top-level, signed `organisationId` claim**
(NOT `user_metadata`, which is user-editable and spoofable):
```bash
psql "$DIRECT_URL" -f prisma/sql/auth_hook.sql
```
Then enable it: dashboard → **Authentication → Hooks → Custom Access Token** →
select `public.custom_access_token_hook`. RLS policies read
`auth.jwt() ->> 'organisationId'`. (The claim only refreshes when the user's token
does — sign out/in after changing someone's org.)

### E2. Apply RLS (live)
```bash
psql "$DIRECT_URL" -f prisma/sql/rls_policies.sql   # after auth_hook.sql
```
This enables RLS on every `public` table (incl. `_prisma_migrations`, locked down)
so the Table Editor shows no UNRESTRICTED tags. The **Prisma app is unaffected** —
it connects via `DATABASE_URL` (privileged role) which bypasses RLS (Option A).

**Tenant columns are now populated on write.** The app stamps `userId` (= the
owner's `auth.uid()`) and `organisationId` on every insert via `tenantOwner()`
(`src/lib/tenant.ts`), and `userId` is `NOT NULL` in the schema on the owned tables
(`LearnedOption` stays nullable — it's a shared global picklist). A fresh cutover
needs nothing extra: `prisma migrate` creates the columns `NOT NULL` and the seed
populates them.

If you already have a Postgres DB with NULL `userId` rows, run the backfill first:
```bash
psql "$DIRECT_URL" -f prisma/sql/backfill_tenant.sql   # before the NOT NULL migrate
```
(Org-owned tables with no owner column — Participant, ProgressNote — need an owner
chosen explicitly; see the file's commented lines.)

### E3. Auth code (code edit)
- Add `@supabase/ssr` + `@supabase/supabase-js`; create `src/lib/supabase.ts`
  (server + browser clients from the env vars).
- Extend `getCurrentUser()` in `src/lib/session.ts`: when `NEXT_PUBLIC_SUPABASE_URL`
  is set, resolve the user from the Supabase session; otherwise fall back to the dev
  cookie (kept behind a `DEV_AUTH` flag). The seam from Phase B means **no call site
  changes** — only this function's body.
- Add `middleware.ts` (root): refresh the session and redirect unauthenticated
  requests for protected routes to `/login`.
- Restructure `src/app/` into route groups `(public)/` (landing, `/login`, pricing)
  and `(protected)/` (everything else). **Do this as its own commit** — it's the one
  structurally disruptive change; keeping it isolated makes a regression easy to find.

### E4. DEV_AUTH flag
Keep the dev role-switch usable behind `DEV_AUTH=1` for local/sandbox testing
(Supabase Auth isn't reachable from the sandbox). **Hard-disable it in the Vercel
production build** — it must never ship enabled.

### E5. Verify (live)
- RLS smoke test (BOLA/IDOR): sign in as an org-A user, attempt to read an org-B
  row id → denied.
- Middleware: hitting a `(protected)` route while signed out → redirected to `/login`.
- The dev role-switch still works locally with `DEV_AUTH=1`.

---

## Phase F (pointer)
Once D & E are in: `/api/health` for UptimeRobot, move photos to Supabase Storage as
**relative paths** (Rule 3), Stripe + Stripe Tax (webhooks → AuditLog, Rule 9),
Resend, PostHog, Sentry, and the Vercel deploy. These slices are independent and can
land in any order.

---

## Rollback
Until D3 is run against production data, everything is reversible: revert the schema
/ adapter / env edits and the app is back on SQLite. After real users exist, rely on
Supabase Point-in-Time Recovery (paid plan) plus the weekly snapshot export.
