# Soft Release Runbook — Caira (dummy data, behind login)

Goal: a permanent, shareable Vercel URL where the **app is locked behind real login**,
only **allowlisted emails** can get in, **RLS** is on, and **all data is dummy**. No
real participant data (hard rule) until legal/privacy are cleared.

This is the trimmed path for a dummy soft-release. Full detail: `docs/PRODUCTION_CUTOVER.md`.

Prereqs you provide: a Supabase account, a Vercel account, the GitHub repo connected.

---

## 1. Database — Supabase (browser)
1. supabase.com → New project, region **ap-southeast-2 (Sydney)**. Save the DB password.
2. **SQL Editor → New query** → paste & run, in this **exact order**:
   - `prisma/sql/schema_baseline.sql`   (the whole schema — already includes ALL the
     newer tables: care profile, assistant, documents, care tasks, incidents,
     credentials, notifications, meds/eMAR, EVV, budgets, billing, messages, handovers,
     + the audit hash-chain / `derivedFromId` / `autoSuggestCap` columns)
   - `prisma/sql/grant_api_roles.sql`   (restore anon/authenticated/service grants)
   - `prisma/sql/search_vector.sql`     (full-text report search — NOT in baseline)
   - `prisma/sql/auth_hook.sql`         (injects organisationId claim into the JWT)
   - `prisma/sql/rls_policies.sql`      (RLS on the original tables)
   - `prisma/sql/rls_policies_v2.sql`   (RLS on the 19 newer tables — **run LAST**;
     without it those tables have NO RLS and would be exposed on the Data API)

   > You do **not** need the per-feature files (`assistant.sql`, `care_tasks.sql`,
   > `incidents.sql`, `credentials.sql`, `documents.sql`, `messaging.sql`,
   > `notifications_med_evv_billing.sql`, `participant_care_profile.sql`,
   > `rbac_grants.sql`, `note_extraction.sql`, `audit_hash_chain.sql`,
   > `org_auto_suggest_cap.sql`) on a **fresh** apply — `schema_baseline.sql` already
   > has their tables/columns, and `rls_policies_v2.sql` covers their RLS. They're only
   > for upgrading an EXISTING live DB (see `PRODUCTION_CUTOVER.md`).
   > `learned_options_per_org.sql` (per-org custom picklists) is optional — the app
   > degrades gracefully without it.
3. **Authentication → Hooks → Custom Access Token** → enable `public.custom_access_token_hook`.
4. Collect from Project Settings: the **Connection string (URI)**, **Project URL**,
   **anon key**, **service_role key**.

## 2. Seed dummy data (laptop, one command)
With `.env` pointing at Supabase (`DATABASE_URL` + `DIRECT_URL` = the connection string):
```
npx prisma generate
npx tsx prisma/seed.ts
```
This loads the sample participants/workers/shifts. (Re-runnable; it clears + reseeds.)

## 3. Host — Vercel (browser)
1. vercel.com → Add New → Project → import **Shmitzer/disability-support-suite** (branch: `main`).
2. **Environment Variables** (Production):
   ```
   DATABASE_URL                   = <Supabase connection string>
   DIRECT_URL                     = <same connection string>
   NEXT_PUBLIC_SUPABASE_URL       = <Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon key>
   SUPABASE_SERVICE_ROLE_KEY      = <service_role key>
   GEMINI_API_KEY                 = <optional; only for AI notes>
   AUTH_ALLOWLIST                 = you@email.com, friend@email.com   ← LOCKS the release
   ```
   Do **not** set `DEV_AUTH` (it is force-off in production anyway → real login is used).
3. Deploy. You get `https://<project>.vercel.app`.
4. In Supabase → **Authentication → URL Configuration**: set Site URL to the Vercel URL
   and add `https://<project>.vercel.app/auth/confirm` to redirect URLs (so magic links land back).

## 4. How the lock works
- Every `(protected)` route requires a Supabase session → unauthenticated visitors hit `/login`.
- `/login` emails a magic link (Supabase built-in email is fine for low volume).
- **Allowlist**: only emails in `AUTH_ALLOWLIST` get in. A signed-in non-listed email is
  bounced to `/auth/denied` (and never gets an account or data). Add/remove people by
  editing the `AUTH_ALLOWLIST` env var in Vercel and redeploying.
- **RLS** is on; the app reads/writes via Prisma (privileged role) so it's unaffected,
  while the public Data API stays tenant-isolated.

## 5. Smoke test (2 min)
- Visit the URL signed-out → you land on the marketing page; `/dashboard` bounces to `/login`.
- Sign in with an **allowlisted** email → magic link → you're in, dummy data shows.
- Sign in with a **non-allowlisted** email → you see `/auth/denied`, no data.
- (optional, once) `npm run verify:rls` against `DIRECT_URL` → `ALL RLS CHECKS PASSED`
  confirms every table (incl. the 19 new ones) is tenant-isolated.

## 6. Before any REAL data later (not tonight)
- Rotate the DB password that was exposed earlier.
- Delete dummy data + reset sequences; finalise privacy policy + consent; legal sign-off.
