# Caira — Overnight Build Plan (enterprise-readiness, phased · 3 sessions · resumable)

Supersedes the (completed) `OVERNIGHT_PLAN.md` for this run. Goal: drive toward
**enterprise-ready, phased** — **Phase 1 = pilot-paid** (hardened + compliant + billable for
small NDIS providers on real data, per `docs/strategy/NEXT_MOVES.md`), then **Phase 2 =
large-enterprise** (SSO/SAML, multi-org admin, security audit, SLAs/DPAs). Runs across three
autonomous sessions: **cc** (Claude Code · logic/wiring), **cd** (Claude Code · `docs/design/` SSOT),
**cw** (Cowork · orchestration/verification).

## Hard rules (every session, every task)
- **Dummy data only.** Never `db push` / `--force-reset` / apply SQL to the live DB. Schema → a new
  **unapplied** `prisma/sql/*.sql`.
- **Never enter/rotate/provision credentials or keys.** Anything needing a new key (Stripe, VAPID,
  Resend, GEMINI, Upstash, SSO IdP) or the DB-password rotation: build up to it, stop, mark `[!]`,
  note it in **Blockers**, move on.
- **Keep green:** `tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓ after each task. Don't commit red.
- **Design-SSOT:** cd commits the `.dc.html` + `HANDOFF.md` entry **before** cc wires that screen.
- **cw never commits/pushes from the mounted repo** — clean clone + laptop push (`CW_PREFLIGHT.md`).
- If blocked, **note it and move to the next item** — never stall the whole queue on one task.

## ✅ Checkpoint & resume protocol (survives a token-cap restart)
Marks: `[ ]` todo · `[~]` claimed/in-progress · `[x]` done · `[!]` blocked (one-line reason in Blockers).

**After EVERY task:** commit the code **and** the ticked box in this file (so progress is durable),
then push your branch. **On (re)start of any session instance:**
1. (cw only) run `docs/CW_PREFLIGHT.md`.
2. `git fetch origin` and read THIS file fresh.
3. In *your* queue, find the first non-`[x]` item. If it's `[~]`, verify whether it actually landed
   (check the repo) before redoing — finish or reclaim it. Never redo an `[x]`.
4. Mark it `[~]`, do it, gate-check, commit + push, mark `[x]`. Repeat until queue end or context cap.
5. Always leave main/your branch **green and releasable** at each commit so a restart is clean.

## Branch & merge model (handles push credentials)
- **cc** works on `claude/cc-enterprise`; **cd** on `claude/cd-enterprise`. Both are Claude Code (have
  push creds) → commit + push their branch after each task. Paths are mostly disjoint (cc = `src/` +
  `prisma/sql`; cd = `docs/design/`), so conflicts are rare; `git fetch && rebase` before each push.
- **cw** (Cowork sandbox, **no push creds**): verifies each branch (clean clone, confirm gates claim +
  additive merge), keeps this file's checkboxes + `COMMAND_CENTRE.md` current, and **prepares** verified
  merges to `main`. Because cw can't push, it records ready merges in **Blockers/Morning** for Edward to
  land at the laptop — OR cc/cd may fast-forward their own green branch into `main` directly if disjoint.
- Keep `main` releasable; integrate at least once per session-resume.

---

## cc queue — `claude/cc-enterprise`  (logic / backend / wiring)
**Phase 1 — pilot-paid**
- [x] **cc1. Security review + fixes.** Full pass (5 parallel reviewers across tenant-isolation/
      IDOR, authn/authz/PIN, PII→external, injection/XSS/SSRF/upload, secrets/headers/DoS). Fixed
      the safe confirmed findings — IDOR scoping on shift/hub/credential/handover/caira-flag
      mutations, `cairaChat` PII scrub, caira spend-cap, security headers, upload cap, open-redirect
      hardening, `/admin` capability gate, tenant-scope guard (skip generated client + add hub/
      cairaFlag models), Sentry PII redaction, SECRETS.md. Commit `87cb552` on
      `claude/start-prompt-cc-uzrp0b` (branch override — see note). tsc/test/build/tenant-scope all
      green. Residual/blocked items in **Blockers** below.
- [ ] **cc2. MFA + secrets hygiene.** Wire MFA on `ADMIN`/`SUPERADMIN` seats; audit secret handling
      (no secrets in client bundles/logs); RLS regression test in CI. (Rotating the *exposed* DB
      password is Edward-gated — note it, don't do it.)
- [ ] **cc3. Phase-H authorisation state machine.** `DRAFT→PENDING_BSP→PENDING_COMMISSION→
      PENDING_GUARDIAN→ACTIVE`, DB/enum-enforced; Medication / PillAppearanceProfile (structured fields)
      / MARLog (immutable) schema as **unapplied** `prisma/sql`. Per `docs/MED_VERIFICATION_SPEC.md`.
- [ ] **cc4. Med visual-verification backend.** Claude-Vision behind `src/lib/ai.ts` — expected-profile
      only (scrub PII), app decides outcome, low-confidence→mismatch fail-safe, never auto-proceed.
- [ ] **cc5. NDIS report / PDF export pack** (backend). Aggregate notes/incidents/shifts/meds into the
      audit-export pack + PDF/CSV generation (`docs/strategy/NEXT_MOVES.md` #1). Reuse existing reporting.
- [ ] **cc6. Instrumentation.** Retention / time-saved / NRR product events via PostHog (consent-gated,
      de-identified) — so metrics exist from day one.
- [ ] **cc7. Caira movement layer.** `CairaWanderController` (wander + travel-to-mic) over the **static
      cutout** — renderer-agnostic; no `.riv` needed. Per `CAIRA_ANIMATION_RECONCILIATION.md`.
- [ ] **cc8. Wire cd's screens as they land** (`/console`, med screens) — gated on the matching cd commit.
**Phase 2 — large-enterprise**
- [ ] **cc9. Stripe billing** (subscriptions/seats) — build to the key boundary; `[!]` for the live keys.
- [ ] **cc10. CI e2e tests + backup/restore runbook + health/monitoring hardening.**
- [ ] **cc11. SSO/SAML scaffold + multi-org admin** — build the seams; IdP config is `[!]` Edward-gated.

## cd queue — `claude/cd-enterprise`  (design · SSOT)
**Phase 1**
- [ ] **cd1. Caira Rive rig + per-state authoring brief** (so Edward can author `caira.riv`). Resolve the
      open Qs (wander scope; 6th "walking" state?; gsap-vs-rAF note for cc).
- [ ] **cd2. `/console` coordinator desktop** — dense tables + side nav (dashboard, participant record +
      NDIS plan, roster, incidents, reports, org settings, documents).
- [ ] **cd3. NDIS report / PDF export-pack UI** + the audit-pack layout (pairs with cc5).
- [ ] **cd4. Medication screens** — med-admin + visual verification (capture / match / mismatch /
      override-with-reason); `/console` authorisation-status + draft; guardian plain-language confirm
      (`/portal`, flag-off/legal-gated skeleton). Per `MED_VERIFICATION_SPEC.md`.
- [ ] **cd5. State pages** — 404 / 500 / offline-PWA fallback.
- [ ] **cd6. Sales-page overhaul featuring Caira** (after cc7 movement is real).
**Phase 2**
- [ ] **cd7. Interface-wide design review** to incorporate Caira consistently (may be a layout overhaul).
- [ ] **cd8. Org onboarding flow + enterprise admin surfaces.**

## cw queue — Cowork (orchestration / verification — no push; prepares laptop pushes)
- [ ] **cw0. Preflight** (`CW_PREFLIGHT.md`) at start and each resume.
- [ ] **cw-loop (continuous):** after each cc/cd push — clean-clone, verify gates-claim + clean additive
      merge to `main`; keep `COMMAND_CENTRE.md` + this file's checkboxes current; record ready merges +
      any `[!]` blockers under **Morning hand-off** for Edward to land. Re-fetch `COMMAND_CENTRE.md`
      immediately before preparing any doc change (concurrent sessions move it).

## ⛔ Edward-gated (never autonomous — build up to, then `[!]`)
Author `caira.riv` · engage the NDIS lawyer + BSP · rotate the exposed DB password · provision
GEMINI / VAPID / Stripe / Resend / Upstash / SSO-IdP keys · apply any SQL to the live DB ·
Vercel / deploy / domains.

## Blockers & morning hand-off
_(append as work proceeds — one line each: which session, which task `[!]`, why, what Edward needs to do)_

- **cc / branch override:** harness bound this session to `claude/start-prompt-cc-uzrp0b`, not
  `claude/cc-enterprise`. cc1 landed there (`87cb552`). Edward: merge/rename, or re-point cc to the
  expected branch for the next item.
- **cc / cc1 `[!]` pre-existing LINT red (not from cc1):** `src/app/(protected)/incidents/rp/RpIncidentClient.tsx`
  fails `npm run lint` — 24 `react-hooks/static-components` + 4 `react/no-unescaped-entities`,
  introduced by the G2 wire-up (`7cd3435`) before gates were runnable. Needs a focused pass to hoist
  the inner presentational components (Eyebrow/Avatar/Badge/…) to module scope (some close over
  render handlers → thread as props). All other gates (tsc/test/build/tenant-scope) are green.
- **cc / cc1 residual — KEY/secret-gated (build-up done, not actioned):**
  · LLM rate-limit + spend cap (incl. the new Caira cap + hub-PIN brute-force guard) are inert until
    **Upstash** (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) is provisioned. · Audio/photo (transcribe/OCR)
    still go to Gemini un-scrubbed — needs a **DPA / on-device** model before real participant data
    (legal-gated). · Verify the Supabase **photos/documents buckets are PRIVATE** (config, not code).
- **cc / cc1 residual — follow-up (safe, deferred for a focused change):** harden the hub attribution
  PIN with a DB fail-count + lockout (schema columns as unapplied `prisma/sql` + graceful
  degradation) — the org-scoping closed cross-org targeting, but a same-org fail-count lockout would
  fully close PIN brute-force on the high-frequency `logHubEntry` path (left uncapped by design).
  Also consider a full script/style **CSP** (needs an app-wide inline-style nonce pass first).
