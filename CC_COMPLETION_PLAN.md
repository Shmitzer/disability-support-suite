# cc Completion Plan — logic/backend path to the final product

**Owner:** cc (Claude Code · `src/` + `prisma/sql`) on `claude/cc-enterprise`.
**Authored by:** cw, 2026-06-28. **Supersedes** the `cc queue` in `OVERNIGHT_PLAN_2026-06-28.md`
(same task IDs carried over; new completeness items added as cc12+). cd + design + the Caira
**Rive** animation are owned by Edward/cd — **cc does not author `.riv` or build screens**; cc only
provides the logic those screens bind to and the state inputs the Rive rig reads.

This plan answers two things: (1) **finish cc's unfinished queue**, and (2) **everything else cc can
implement** to make the product complete — pilot-paid first, then large-enterprise.

---

## How to read this
Tasks are grouped into execution **Blocks A–E**, ordered so the highest-leverage, no-design-gate,
revenue-critical work lands first (per `docs/strategy/NEXT_MOVES.md`: NDIS export pack #1,
instrumentation #3, compliance core #4). Within a block, top-to-bottom is the suggested order.

Marks: `[ ]` todo · `[~]` in-progress · `[x]` done · `[!]` blocked (one-line reason → Blockers).

**Already done (do not redo):** cc1 security pass · cc2 RLS-CI repair + secrets audit ·
cc3 Phase-H medication authorisation state machine + schema · cc1b uzrp0b hardening (PR #7, pending
Edward merge — includes the learned-options analytics redaction follow-up).

---

## Hard rules (every task — unchanged from the overnight plan)
- **Dummy data only.** Never `db push` / `--force-reset` / apply SQL to the live DB. Schema → a new
  **unapplied** `prisma/sql/*.sql`, idempotent + editor-safe, validated against a throwaway Postgres 16.
- **Never enter/rotate/provision credentials or keys.** Anything needing a key (Stripe, VAPID, Resend,
  GEMINI, Upstash, SSO IdP) or the DB-password rotation → build to the boundary, stop, mark `[!]`.
- **Keep green:** `tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓ after each task. Never commit red.
- **Architecture rules hold** (the 12 in `COMMAND_CENTRE.md`): all LLM via `src/lib/ai.ts`, scrub PII
  before any external API, new table ⇒ `userId` + `organisationId?` + RLS, validate every LLM output,
  idempotency key on every shift mutation, AuditLog every sensitive action.
- **Design-SSOT gate:** cc wires a screen only **after** cd commits its `.dc.html` + `HANDOFF.md` entry.
- **Per task:** commit code + tick the box here + push `claude/cc-enterprise`. Leave main releasable.

---

## Block A — Revenue-critical, no design gate (build first)
> These move the pilot-paid needle directly and need no cd commit. Do this block before anything else.

- [ ] **cc5. NDIS report / PDF export pack (backend).** *NEXT_MOVES #1 — ship before the games layer.*
      Aggregate notes / incidents / shifts / medication-admin into the provider audit-export pack;
      generate **PDF + CSV**. Reuse the existing reporting/`recordAudit` plumbing. Pure aggregation core
      (date-range, participant scope, tenant-scoped) + a render layer behind a server action,
      capability-gated, audited (`REPORT_EXPORTED`). No real data — dummy fixtures. Pairs with cd3 UI
      later, but the backend + a headless export are buildable now.
- [ ] **cc6. Product instrumentation.** *NEXT_MOVES #3 — start the time-series now.* Retention /
      time-saved / active-seats / time-to-report / NRR product events via PostHog — **consent-gated**
      (`hasAnalyticsConsent()`) and **de-identified** (no participant PII, no free-text). A thin
      `track(event, props)` seam so events are emitted from day one and 12-month trend accrues.
- [ ] **cc-L. Track L — legal acceptance-logging + DPA/ToS/consent scaffold.** Supports *NEXT_MOVES #4*
      (the lawyer rules on classification; cc builds the machinery). Acceptance-logging to
      `Consent` / `ParticipantAccessGrant` (who accepted which version when), versioned policy records,
      dual-role consent capture. Privacy/ToS/DPA **drafts** only — final wording is the lawyer's. No
      design gate. (Legal *engagement* stays Edward-gated.)
- [ ] **cc12. `anonymiseUser()` right-to-erasure.** Closes the last open item on the pre-real-user gate
      (`COMMAND_CENTRE.md`). Needs the full NDIS Participant fields first (add them if missing →
      unapplied SQL). Soft-delete (`deletedAt`/`anonymisedAt`) + a pure, audited anonymise routine that
      preserves the audit hash-chain. Tested against dummy data.
- [ ] **cc13. cc1 hardening follow-ups** (small, no gate — from the cc1 Blockers list):
      (a) fold `/api/admin/caira-access`'s role-literal check into a `WebAccessManage` Capability in
      `rbac.ts`; (b) switch `clock-actions`/`visit-verification`/`shift-actions` worker fetches from
      `findUnique`+relationship-guard to `findFirst({ where:{ id, ...tenantScope } })` (defense-in-depth);
      (c) byte-sniff `/api/transcribe` upload instead of trusting client `mimeType`.
      *(The learned-options analytics redaction follow-up is already handled by PR #7.)*

## Block B — Medication completeness (builds on cc3)
- [ ] **cc4. Med visual-verification backend.** Claude-Vision behind `src/lib/ai.ts`: compare a capture
      against the **expected `PillAppearanceProfile` only** (scrub PII), the **app** decides the outcome,
      low-confidence ⇒ **mismatch fail-safe**, never auto-proceed. Writes MAR verification cols + a
      `MedAuthEvent`. Per `docs/MED_VERIFICATION_SPEC.md`. Pairs with cd4 UI.
- [ ] **cc14. Guardian external-confirm pathway (scaffold, flag-off).** The plain-language guardian
      confirmation step on the cc3 authorisation chain. Build the state + server action behind a default
      **off** flag; the live pathway is **legal-gated** (`[!]` — real guardians + real data need the
      lawyer + BSP). Skeleton + tests only now.

## Block C — Caira behaviour layer (complements the Rive rig — cc owns logic, not animation)
> Edward authors `caira.riv`; cd rigs it. cc's job is **deciding which state + where**, then feeding the
> rig. The renderer already binds `@rive-app/react-canvas` two-way.
- [ ] **cc7. Caira state-driver + wander controller.** A renderer-agnostic controller that (1) maps app
      context → the Rive **state machine inputs** (`number state` 0–4 greet/cheer/reassure/idle/goal,
      `bool quiet`), and (2) drives the nav `CairaBar` **wander + travel-to-mic** motion. Static-cutout
      fallback path stays as a secondary (no-`.riv`) renderer. Per
      `docs/design/CAIRA_ANIMATION_RECONCILIATION.md`. Resolve the open Qs **with cd** (wander scope; a
      6th "walking" state?) — cc consumes whatever the rig contract cd commits.
- [ ] **cc8. Wire cd's screens as they land** — `/console`, medication screens, state pages — each
      **gated** on the matching cd `.dc.html` commit. Wire to the live backend; no net-new design.

## Block D — Reliability / offline / data completeness
- [ ] **cc15. Offline sync — service-worker half.** The 2.2 core (`src/lib/offline-sync.ts`) is done;
      this is the wiring: `@serwist/next` SW (app-shell precache + read caching + offline fallback —
      **do NOT cache/replay server-action POSTs**), web manifest, IndexedDB binding for the outbox, and a
      route-handler replay mirror for Background Sync. Laptop/browser test needed (note in Blockers).
- [ ] **cc16. Populate `activitiesLog` / `incidentFields`.** Schema exists but app code never writes
      them (`COMMAND_CENTRE.md` schema note). Wire the writers + tests.
- [ ] **cc17. SCHADS + price-guide reference-data wiring.** The SCHADS engine (`schads.ts`) and NDIA
      importer (`price-guide.ts`) are built but the SCHADS defaults are **UNVERIFIED** and no catalogue
      is loaded. Wire SCHADS to roster hours + a state public-holiday calendar; import the confirmed NDIA
      Support-Catalogue version (reference data, not participant data). Numbers/version are Edward-confirmed.

## Block E — Large-enterprise (Phase 2)
- [ ] **cc9. Stripe billing** (subscriptions / seats) — plumbing + webhook→AuditLog already exist; extend
      to seat/site model. Build to the key boundary; live keys are `[!]` Edward-gated.
- [ ] **cc18. MFA enforcement seam.** Server helper over
      `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`, enforce `aal2` in `middleware.ts` for admin
      segments behind a default-**off** env flag (enrollment rolls out before enforcement). Unblocks once
      Edward enables Supabase MFA + cd commits the TOTP enrollment/challenge screens (`[!]`).
- [ ] **cc10. CI e2e + backup/restore runbook + health/monitoring hardening.**
- [ ] **cc11. SSO/SAML scaffold + multi-org admin.** Build the seams; IdP config is `[!]` Edward-gated.

---

## ⛔ Edward-gated (cc builds up to these, never past them)
Author `caira.riv` · engage the NDIS lawyer + BSP · rotate the exposed DB password · provision
GEMINI / VAPID / Stripe / Resend / Upstash / SSO-IdP keys · enable Supabase MFA · **apply any SQL to the
live DB** · Vercel / deploy / domains. Everything in this plan is dummy-data-only until the legal gate clears.

## Definition of done (per task)
Green `tsc`/`lint`/`test`/`build` · any schema change as an **unapplied** idempotent `prisma/sql/*.sql`
(validated against a throwaway PG16) · graceful degradation when the column/table/key is absent ·
ccu entry in `COMMAND_CENTRE.md` · this file's checkbox ticked · branch pushed.

## Suggested order (one line)
**Block A** (cc5 → cc6 → cc-L → cc12 → cc13) → **Block B** (cc4 → cc14) → **Block D**
(cc15/16/17, parallelisable) → **Block C** as cd screens + the Rive contract land → **Block E** last.
Rationale: A is no-gate revenue-critical; B completes the medication safety story already half-built;
C waits on cd/Rive (your lane); E is post-pilot enterprise.

## Blockers & hand-off
_(cc appends one line per `[!]`: which task, why, what Edward needs.)_
- **cc14 / cc18 `[!]`** — legal-gated (guardian pathway) and Edward+cd-gated (MFA enrollment UI) — see above.
- **cc15 `[!]`** — service-worker wiring needs a real browser + `node_modules`; verify on the laptop.
