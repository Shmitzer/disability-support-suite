# Soft launch tonight — 5 real testers, DUMMY data

One-page checklist for getting 5 real people logging in tonight on a shareable Vercel
URL, behind an allowlist, with **dummy data only**. This deliberately sidesteps the
NDIS privacy/legal gate (hard rule: no real participant data until that gate clears).

Full technical detail: `docs/SOFT_RELEASE.md`. Deeper cutover: `docs/PRODUCTION_CUTOVER.md`.

> ⚠️ Tell the testers: **dummy data only — do not enter real participant info.**

---

## Critical path — gets the 5 users in (~45 min)

- [ ] **1. Cowork merges the feature PRs → `main`** (Vercel deploys `main`). PR #4 = RLS,
      PR #3 = logic batch. Nothing below works until this lands.
- [ ] **2. Supabase project** (region: ap-southeast-2 Sydney; save the DB password).
      SQL Editor → run **in this exact order**:
      `schema_baseline.sql` → `grant_api_roles.sql` → `search_vector.sql` →
      `auth_hook.sql` → `rls_policies.sql` → `rls_policies_v2.sql` (last).
      Then Authentication → Hooks → enable `custom_access_token_hook`.
- [ ] **3. Seed dummy data** (laptop, `.env` → Supabase):
      `npx prisma generate && npx tsx prisma/seed.ts`
- [ ] **4. Vercel deploy** — import the repo (branch `main`). Use **Vercel Pro**
      (Hobby is non-commercial). Production env vars:
      `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
      **`AUTH_ALLOWLIST` = the 5 testers' emails** (this is the lock). Do NOT set `DEV_AUTH`.
- [ ] **5. Magic links** — use Supabase's **built-in email** tonight (fine for 5 users,
      zero setup). Resend/custom SMTP can wait for the domain.
- [ ] **6. Supabase URL config** — Site URL = the Vercel URL; add
      `https://<project>.vercel.app/auth/confirm` to redirect URLs.
- [ ] **7. Smoke test** — signed out → marketing page, `/dashboard` → `/login`;
      allowlisted email → in, dummy data shows; non-allowlisted → `/auth/denied`.
      Optional: `npm run verify:rls` → `ALL RLS CHECKS PASSED`.
- [ ] **8. Invite the 5 testers** (URL + the dummy-data warning).

## Turn on if you have 5 min (already coded — just add keys)

- [ ] **Sentry** — `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (crash alerts).
- [ ] **PostHog** — `NEXT_PUBLIC_POSTHOG_KEY` (already integrated; skip Plausible — redundant).
- [ ] **Tally** feedback form — share the embed/link with testers.

## Kick off tonight, finishes later (DNS / registration lead time — NOT blockers)

- [ ] Settle the name → register **business name on ABR** (~$44/yr, needs active ABN).
- [ ] Register **`<name>.com.au` + `.com`** (Crazy Domains / VentraIP; `.com.au` needs ABN).
- [ ] **Resend** — add the domain + SPF/DKIM DNS, then point Supabase SMTP at it for
      branded magic links. (Already wired in `src/lib/email.ts`.)
- [ ] **`hello@` mailbox** — Zoho (free, webmail-only) or Google Workspace (~$8.40/user).
- [ ] **Stripe** account — create now so it's ready; not needed for free testers.

## HARD GATE before any REAL participant data (explicitly not tonight)

Legal sign-off on `/privacy`, rotate the exposed DB password, Upstash rate-limit keys,
`anonymiseUser()` right-to-erasure. Keep the "dummy data only" rule firm until done.

## Validity notes on the infra list

- Sentry, PostHog, Resend, Stripe are **already integrated in code** — they need keys,
  not new vendors. **Skip Plausible** (PostHog already there) and **skip Iubenda**
  (a 13-section privacy draft already lives at `/privacy`; it needs legal review, not a
  generic generator).
- Resend is **not** required for magic links tonight — Supabase's built-in email covers
  5 users. Resend is for transactional mail + branded SMTP once the domain exists.
- Vercel Hobby is non-commercial; use **Pro** for a commercial SaaS.
