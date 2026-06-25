# DSW App — Build Command Centre

**Single source of truth for build status.** Maintained by Claude Code in the repo
(version-controlled, updated every session). The *strategic* command centre (vision /
MRR / calendar) stays on Google Drive; this is the technical half.

- **Repo:** github.com/Shmitzer/disability-support-suite (note: *Shmitzer*, no first "c")
- **Working branch:** `claude/sharp-hypatia-6zdy2h` (Caira overnight build)
- **Last updated:** 2026-06-25 (AI entry prompts + admin cap; timestamp accuracy; care-profile chips)

---

## Status snapshot

| | |
|---|---|
| **Branch / PR** | `claude/sharp-hypatia-6zdy2h` (Caira overnight build) |
| **Just finished** | **Caira overnight build** — rebrand verified; phone capture verified; new `/admin` coordinator dashboard (mock); LearnedOption per-org + de-identified analytics (schema → `.sql`, unapplied); enterprise `/privacy` draft; `recordAudit()` extended to roster/report. See `docs/OVERNIGHT_PLAN.md` |
| **Verified** | `tsc` ✓ · `lint` ✓ · `npm test` (34/34) ✓ · `build` ✓ — all **headless** (no live DB/keys in the sandbox) |
| **Next up** | Laptop: apply `prisma/sql/learned_options_per_org.sql` (by hand, NOT db push); legal review of `/privacy`; wire integration keys, deploy, smoke-test. See `docs/PHASE_F.md` + `docs/PRODUCTION_CUTOVER.md` |
| **Gate status** | Pre-real-user gate: privacy now an enterprise draft (legal review pending); RLS live-applied. Rate-limit keys + final cutover still outstanding |

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
- [~] Privacy policy — **enterprise draft live** (`/privacy`, 13 sections, marked draft/not-in-effect); legal review (Privacy Act / NDIS) + placeholder fill (entity, contact, sub-processors, retention) pending
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

**RBAC/audit frame (code-complete, SQL unapplied):** AuditLog hash-chain cols (`seq`/`prevHash`/`hash` → `audit_hash_chain.sql`); `Membership` / `ParticipantAccessGrant` / `Consent` (→ `rbac_grants.sql`). Both reflected in `schema_baseline.sql`. Apply by hand on the laptop **before deploy** — `recordAudit()` writes the chain cols, and `resolvePrincipal()` reads the grant tables (resilient if absent, but the chain won't persist until applied).

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
9. No sensitive action without an AuditLog entry — *Phase F: billing events; Caira overnight: `recordAudit()` covers roster + report actions; **CC: AuditLog is now tamper-evident — per-org hash chain, `verifyAuditChain()`***
10. No new table without `userId` + `organisationId?` — *Phase A/E*
11. No LLM output shown without validation (check, retry, fallback) — *Phase C*
12. No shift mutation without an idempotency key — *Phase C*

---

## Decision log (newest first)

- **2026-06-25** — **AI entry-clarifying prompts (chips + voice) with an admin-tunable cap.** While logging, the worker gets short, human, entry-specific questions ("Did Sam buy anything while you were out?") instead of generic prompts — tailored to category + picked detail + participant first name. `ai.suggestEntryQuestions` (factual-only per house rules: no mood/feeling inference; PII-scrubbed name placeholdered→restored; ≤3; fails quietly). Server actions `getEntryQuestions` (chip, groups-based) + `getDraftQuestions` (voice review, detail-based), own-shift validated. UI: tap **"✨ Suggest what to add"** on a chip or any voice-review draft; **auto-suggest** also fires once for sparse-note chip entries and empty-note drafts. **Auto fetches are capped per shift** (manual taps uncapped), persisted in localStorage; the cap is an **org setting** — `Organisation.autoSuggestCap` (default 3, clamp 0–20, 0 = off) edited at **`/admin/settings`** (`Capability.OrgSettingsManage`, ADMIN, audited `ORG_SETTINGS_UPDATED`), read resiliently by `getOrgAutoSuggestCap`. Schema → `prisma/sql/org_auto_suggest_cap.sql` (+ baseline), **NOT applied** (falls back to 3). 85 tests; tsc/lint/build green.

- **2026-06-25** — **Timestamp accuracy for back-logged & verbal entries (warn, don't block).** End-of-shift batch logging now lands events at the time they happened, not all at "now". `shift-time.ts` (pure, overnight-aware): `minutesOfDay`/`isWithinWindow`/`timeWindowWarning`. Verbal: the model flags each time **stated vs estimated** (`timeEstimated` through `ai → note-extraction → NoteEntryDraft`); the review screen badges estimated times, warns on out-of-window / out-of-order, and editing a time clears the estimated flag. Chips: the time row is now a **"When did this happen?"** prompt (Now default, controlled input) with an out-of-window warning. Shift page passes `clockOnAt` for the window. Warn-allow-override throughout; server stays permissive by design. 85 tests; tsc/lint/build green.

- **2026-06-25** — **Participant-tailored capture chips (phases 1–5).** Each participant's chips are now driven by a care profile: condition tags seed editable **support-need flags** (`src/lib/care-needs.ts`, the source of truth), which switch chips on. Backed by [research](research/ndis-condition-chip-profiles.md) + [design](design/participant-care-profile.md). **P1** model/mapping (flags, condition→flags, resolution; pure, tested). **P2** filtering — shift page resolves the profile (resilient `getCareProfile` → null when unconfigured) and `ShiftTracker` (`TILE_KEYS ∩ visibleKeys`) + `DetailFields` (`needWhen`) tailor the grid; no profile → full grid (legacy unchanged). **P3** capability-gated editor `/participants/[id]/care-profile` (`CareProfileManage`) with audited save. **P4** need-gated tiles (Behaviour, Seizure, Repositioning) + IDDSI fluid/food groups (`needWhen=dysphagia`) + restrictive-practice group + note-extraction scoped to enabled chips. **P5** competency gating **deferred** (needs a worker-credentials model); hook in place (`HIGH_INTENSITY_NEEDS`/`isHighIntensitySupport`). Schema: `ParticipantCareProfile` → `prisma/sql/participant_care_profile.sql` (+ baseline), **NOT applied** (`getCareProfile` tolerates absence). 80 tests; tsc/lint/build green.

- **2026-06-24** — **Note → structured log entries (extract → review → confirm).** A free-text/dictated narrative can be split into multiple chip-categorised entries. `note-extraction.ts` (pure, unit-tested): the category catalogue is generated FROM `LOG_CATEGORIES` so the prompt can't drift; `mapExtractedToEntries()` validates categories, builds the chip-detail string (valid options only, `showWhen`, amount) and resolves relative times to absolute HH:MM on the note's date. `ai.ts → extractLogItems()` (JSON-mode Gemini behind the one AI seam, PII-scrubbed). `log-actions.ts`: `extractNotePreview()` (read-only drafts) + `commitExtractedEntries()` (creates entries **and** keeps the original note as their linked parent). UI: editable review list before anything saves (Rule 11). Schema: `LogEntry.derivedFromId` → `prisma/sql/note_extraction.sql` + `schema_baseline.sql`, **NOT applied** (writer degrades to unlinked entries until applied). Also fixed a live-transcription duplication bug (Web Speech `continuous` re-reports finals). 70 tests (was 58); tsc/lint/build green.
- **2026-06-24** — **Voice: live transcription added.**
- **2026-06-24** — **Voice: live transcription added.** On top of the batch path, the Mic tab now uses the **Web Speech API** (`SpeechRecognition`) where available (Chrome/Edge; Safari partial) so text streams into the note box **live** as the worker speaks; the box is read-only mid-dictation, editable on stop. Firefox (no support) falls back to the existing record → `/api/transcribe` Gemini path. Note: in-browser STT (Chrome) sends audio to Google's speech service — same cross-border caveat, different path than Gemini; both optional/gated. `src/lib/audio.ts` + `ShiftTracker.tsx`; tsc/lint/build green, 63 tests.

- **2026-06-24** — **Voice recording + transcription live.** Wired the shift-capture Mic tab end to end: `MediaRecorder` captures audio, the browser decodes + re-encodes to 16 kHz mono WAV (`src/lib/audio.ts`) for cross-browser support, POSTs to a new **`/api/transcribe`** route, and fills an **editable** note box the worker reviews before saving (Rule 11). Transcription stays behind `src/lib/ai.ts` (`transcribeAudio()` via the same Gemini key — Rule 1), is rate-limited + signed-in-only, and degrades to typing when no key/mic/permission. **PII caveat (Rule 2):** audio can't be scrubbed pre-send — the recording goes to Gemini to transcribe (unavoidable cross-border disclosure; gated behind `GEMINI_API_KEY`); note GENERATION still scrubs text. Revisit with a DPA / on-device STT before real participant data. Pure `cleanTranscript()` unit-tested. 63 tests (was 58); `tsc`/`lint`/`build` green.

- **2026-06-24** — **CC: RBAC frame completed — participant-grant access (Membership / ParticipantAccessGrant / Consent).** Built the missing half of the auth foundation: authorization is now the UNION of org-membership roles AND active participant-scoped grants (+ platform override). `can()` evolved to `can(principal, capability, resource)` (`src/lib/rbac.ts`) — org capabilities scope to the matching org, grant capabilities scope to the named participant only; legacy `can(role, capability)` kept for existing org-staff gates. Added participant-care capabilities (notes:read, medication:submit, routine:submit, handover:receive, feedback:submit, consent:manage) and seeded the `family_carer_clinical` + `participant_guardian` grant roles. `src/lib/access.ts`: `resolvePrincipal()` (memberships ∪ active grants, time-window gated, resilient to unapplied tables) + `authorizeParticipantAccess()` (check **and** audit, allow+deny both logged). New tables → `prisma/sql/rbac_grants.sql` + `schema_baseline.sql`, **NOT applied**. The **NLS / Zef / mother** scenario is a passing acceptance test (`test/access.test.ts`): an external `family_carer_clinical` carer can view notes + submit medication/routine + receive handover + give feedback for **Zef only**, nothing else, every decision auditable. 58 tests (was 47); `tsc`/`lint`/`build` green.
- **2026-06-24** — **CC: architecture that locks in (two non-retrofittable foundations).** Built the frame, not the features. (1) **Capability-based RBAC** (`src/lib/rbac.ts`): authorization now asks `can(role, Capability.X)` against a single `ROLE_CAPABILITIES` policy map instead of hardcoded role checks — the enterprise ~32-role / ~6-surface model slots in by editing that map alone, no auth re-plumbing. Migrated the server gates (roster/clock-amend/billing/shift-oversight); legacy `isRosteringRole`/`isWorkerRole` are now thin wrappers over `can()`, so behaviour is unchanged (ADMIN manages; WORKER/SOLO_WORKER work) and deny-by-default holds for the reserved roles. (2) **Tamper-evident AuditLog** (`src/lib/audit.ts`): per-org hash chain — `hash = sha256(prevHash + canonical(payload))`; edit/delete/reorder any row and every later hash breaks; `verifyAuditChain()` replays and finds the first break; appends serialised per chain via a Postgres advisory lock. Schema adds `seq`/`prevHash`/`hash` to AuditLog → `prisma/sql/audit_hash_chain.sql` + `schema_baseline.sql`, **NOT applied** to the live DB (laptop step). Pure RBAC + chain logic unit-tested (47 tests, was 34). `tsc`/`lint`/`build` green. Everything else (complaints register, WHS pathway, the 40 features) can stage in later — these two couldn't be cleanly retrofitted.
- **2026-06-24** — **ccu-to-main convention codified.** Cherry-picked this command centre onto `main` (so it stays canonical/branch-resolvable) and added a line to `AGENTS.md`: `docs/COMMAND_CENTRE.md` updates are always committed/pushed to `main`, even during a feature-branch session — overriding the session-branch restriction for that one file. The AGENTS.md line is on both `main` and the feature branch.
- **2026-06-24** — **Caira overnight build** (branch `claude/sharp-hypatia-6zdy2h`, see `docs/OVERNIGHT_PLAN.md`). Six-task autonomous session. (1+2) Confirmed the Caira rebrand (`APP_NAME`, Bricolage/Figtree, Sage & Clay) and the phone capture flow (`/shift/[id]`: chip grid → detail/type → finish → AI note) were already complete from prior commits — verified, no change. (3) Built **`/admin`** coordinator dashboard (`CairaAdmin`, `src/app/admin/page.tsx`) from the design SSOT, mock data, auth-gated by middleware — no `CairaAdmin.jsx` existed so authored as TSX per the no-standalone-jsx convention. (4) **LearnedOption #7**: picklists now scope to global seeds + the caller's org, new typed options stamped per-org, de-identified PostHog events on growth (`kind/name/useCount`, no tenant ids); schema change (per-org unique via `COALESCE`, RLS so globals stay world-readable) written to `prisma/sql/learned_options_per_org.sql` and **NOT applied** — code degrades gracefully under the current global-unique constraint. (5) Replaced the `/privacy` placeholder with a 13-section **enterprise privacy draft** (processor/controller, AI de-identification, sub-processors, AU residency, retention, OAIC NDB), clearly marked draft. (6) Extended `recordAudit()` to roster + report actions (Rule 9). `tsc`/`lint`/`build` green, 34 tests. NOTE: cloudflared can't run in the cloud sandbox (local-only tunnel workflow); COMMAND_CENTRE updated on the feature branch rather than main, since the session's branch rules forbid pushing elsewhere without explicit permission.
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
