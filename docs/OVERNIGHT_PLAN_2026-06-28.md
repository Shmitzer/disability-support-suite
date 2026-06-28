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
- [x] **cc1. Security review + fixes.** Full pass (tenant-isolation / auth / secrets-PII / injection).
      Fixed (commit `74f5777`): 4 HIGH IDOR (revokeHubDevice, closeHubSession, hubCheckOut,
      addWorkerCredential/listWorkerCredentials), the HIGH PII leak (cairaChat now scrubs names before
      Gemini), open-redirect in /auth/confirm, + MED/LOW (participant-access gates on hub
      open/checkin/log + reportIncident, acknowledgeHandover null bypass, setTaskCompletion careTask
      check, caira/flags IDOR, declineShift link, writeHandover recipient org, hub PIN brute-force
      lockout, Gemini key→header, caira spend-cap, waitlist per-IP throttle). Gates green. Deploy-gated
      + hardening follow-ups logged under Blockers.
- [x] **cc2. MFA + secrets hygiene.** Done (commit `aaa1de1`): **RLS regression in CI restored** — the
      `check:tenant-scope` guard was silently broken (it scanned the Prisma-7 generated client's JSDoc
      → 200+ false positives); now skips generated output and once again catches unscoped tenant reads.
      **Secrets-in-bundle/log audit = clean** (verified: every secret env read is server-only, no
      `NEXT_PUBLIC_` leak, no key logged; the one URL-embedded key was moved to a header in cc1).
      **MFA is Edward+design-gated** → see Blockers (`[!]`); not autonomously buildable (needs Supabase
      MFA enabled + cd enrollment UI; enforcing AAL2 without enrollment locks admins out).
- [x] **cc3. Phase-H authorisation state machine.** Done (commit `d424639`). Pure state machine
      `src/lib/med-authorisation.ts` (8 tests) + a **DB-enforced** trigger in `prisma/sql/medication.sql`
      (UNAPPLIED) so a direct write can't skip a stage — **validated against a throwaway Postgres 16**
      (skips/backwards/terminal/bad-enum all rejected). Schema: `Medication.authStatus`+`isChemicalRestraint`,
      `PillAppearanceProfile` (structured), `MedAuthEvent` (immutable chain), MAR verification cols on
      `MedicationAdministration` — MAR + chain immutability triggers verified. `setMedicationAuthStatus`/
      `listMedicationAuthEvents` actions (coordinator-gated). cc4 (vision) + guardian external-confirm
      pathway (Edward-gated) build on this.
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

- **cc / cc1 `[!]` deploy-config (Edward):** in production set **`AUTH_ALLOWLIST`** (unset = open magic-link
  signup → anyone self-provisions a WORKER) and **`UPSTASH_REDIS_REST_URL`/`_TOKEN`** (unset = the
  rate-limit throttle, global LLM spend-cap, AND the new hub-PIN brute-force lockout are all no-ops).
  Code is correct + fail-open by design; these are env values only.
- **cc / cc1 hardening follow-ups (not blocking, code-startable later):** (1) `/api/admin/caira-access`
  gates web-access by a bespoke role-literal check — fold into a `WebAccessManage` Capability in
  `rbac.ts`. (2) Defense-in-depth: `clock-actions`/`visit-verification`/`shift-actions` worker fetches use
  `findUnique`+relationship-guard — switch to `findFirst({ where:{ id, ...tenantScope } })` (guards hold
  today, so not exploitable). (3) `/api/transcribe` trusts client `mimeType` (no byte-sniff). (4)
  learned-options analytics emits worker free-text `name` — redact before capture.
- **cc / cc2 `[!]` MFA (Edward + cd):** wiring MFA on ADMIN/SUPERADMIN needs (a) Edward to enable MFA in
  the Supabase project (Auth settings) and (b) cd to design the TOTP enrollment + challenge screens.
  Seam plan for cc once unblocked: a server helper over `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`,
  then enforce `currentLevel === 'aal2'` in `middleware.ts` for admin segments behind an env flag
  (default off) so enrollment can roll out before enforcement. Not shipped now (untested auth-enforcement
  that could lock admins out is not safe to land autonomously).
- **cc / cc1 `[!]` legal/DPA (Edward, pre-real-data):** audio transcription + document-photo OCR send
  un-scrubbable PII to Gemini (cross-border) — known/accepted caveat; needs a DPA or on-device STT/OCR
  before real participant data. Dummy-data gate already covers this.
