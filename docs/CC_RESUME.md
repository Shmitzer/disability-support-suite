# cc — Resume Prompt (Phases 0 · 1 · 2)

**Point a fresh Claude Code session here to resume.** You are **cc** (Claude Code — backend/logic/
wiring in `src/`). Respect the 12 architectural rules (`COMMAND_CENTRE.md`) and the design-SSOT
convention (cd designs in `docs/design/` first; you build `src/` to match — don't let them drift).
Full plan: `docs/IMPLEMENTATION_PLAN_MVP.md`. Locked decisions: `docs/DECISIONS.md`. Verify live
state before acting; run `tsc/lint/build/test` green before considering anything done.

**First move on resume:** run `git status` + read `docs/COMMAND_CENTRE.md` "Status snapshot" to see
what's already committed, then continue at the lowest unfinished phase below. Tick items as you go.

---

## Phase 0 — Foundation hardening + ops (do first; no design dependency)

- [ ] 0.1 Produce the single **ordered SQL apply script** for the 13 unapplied tables
      (`care_tasks`, `incidents`, `credentials`, `notifications_med_evv_billing`, `messaging`,
      `documents`, `assistant`, `note_extraction`, `participant_care_profile`,
      `org_auto_suggest_cap`, `audit_hash_chain`, `rbac_grants`, `learned_options_per_org`)
      + a post-apply RLS sweep for the new tables. Apply `audit_hash_chain` + `rbac_grants` first.
      (Hand the script to Edward — by-hand apply in Supabase, NOT `db push`.)
- [ ] 0.2 Commit the pending `rbac.ts` SUPERADMIN wiring; verify tsc/lint/build.
- [ ] 0.3 Wire the rate-limiter live + a budget alarm / hard spend cap (currently scaffolded, inert
      without Upstash keys).
- [ ] 0.4 Add a **CI guard that fails on unscoped tenant-table reads** (the RLS-bypass-via-Prisma is
      load-bearing — one unscoped query = an IDOR).
- [ ] 0.5 Confirm env-gating flips all four integrations on (Stripe/Sentry/PostHog/Resend); PostHog
      behind the consent banner. MFA + full audit on the SUPERADMIN seat; never the default login.

**Exit:** green tsc/lint/build/test · apply script + RLS sweep delivered · rate-limit + spend cap
live · CI tenant-scope guard passing · rbac.ts committed.

---

## Phase 1 — First-customer MVP (mid-size provider; `/console` IS in scope)

Wire each screen AFTER cd lands its `.dc.html` + screenshots. Build behind capability gates.

- [ ] 1.1 Wire worker-app screens to existing server actions: voice capture, note→entries review
      list, AI clarifying prompts, care-profile editor, timestamp prompts, supervisor approval.
- [ ] 1.2 Build out **`/console`** (coordinator desktop): participant records + NDIS plan fields,
      roster, incident register, reports/KPIs + CSV export, org settings, documents.
- [ ] 1.3 Incident register + reportable workflow; **lite eMAR** (due/given/withheld/refused/PRN);
      worker credentials + expiry → competency gate + compliance reminders.
- [ ] 1.4 In-app notifications (email + web push wired but may phase in); analytics consent banner;
      AI in-page disclaimers (resolver `notices.ts` done — needs placement).
- [ ] 1.5 Stripe products/prices + subscribe→portal→cancel + webhook→audit (gated on the Pricing
      track delivering numbers).
- [ ] 1.6 Minimal `/platform` SUPERADMIN; wire platform-admin override into any legacy gates lacking
      it. `anonymiseUser()` right-to-erasure + the full NDIS Participant fields it depends on.

**Exit:** a pilot provider org runs end-to-end on real data (after the legal gate clears) — workers
log full shifts, coordinators run `/console`, incidents/meds/credentials tracked, reports export,
org billed. Smoke: RLS BOLA (org-A can't read org-B) · Stripe lifecycle · photo add/reload (paths,
not base64).

---

## Phase 2 — Enterprise expansion (after first revenue)

Sequence: revenue → moat → compliance depth → social last.

- [ ] 2.1 `/portal` (participant + family/guardian) — gated by the legal consent model.
- [ ] 2.2 Offline / PWA + sync — service worker, local queue, sync-on-reconnect (idempotency keys
      already exist); deterministic conflict resolution + pending/synced states.
- [ ] 2.3 Messaging + shift handover.
- [ ] 2.4 Budgets + billable items + claim CSV; AU NDIS price-guide importer (periodic NDIA
      spreadsheet file — no public API; confirm file/version with Edward).
- [ ] 2.5 Enterprise depth: SSO, Xero/payroll, SCHADS award interpretation, auto-generated NDIS
      report/PDF packs, plan budget burn-down dashboards, white-label multi-org tier; full `/platform`.

**Keep dark behind flags** (`SOCIAL_CONNECTIONS_ENABLED`, `MULTIPLAYER_GAMES_ENABLED`) until a
dedicated safeguarding + child-safety build. Therapeutic single-player games + the Caira character
may ship as differentiation.

---

## Parallel — Legal drafts (run alongside; Edward is engaging the lawyer)

- [ ] L.1 Scope the legal brief + draft starting points: privacy policy (AI processing, PII scrub,
      APP 8 cross-border, Sydney residency, no-AI-training, 7-yr retention, erasure), provider ToS
      (B2B), DPA + sub-processor list (Supabase/Gemini/Resend/Vercel/Stripe/PostHog/Sentry),
      dual-role authority-to-access consent.
- [ ] L.2 Wire ToS/DPA/consent acceptance logging to `ParticipantAccessGrant` + `Consent`.
      (Lawyer reviews/finalises before `/privacy` `/terms` `/dpa` go live with version + date logged.)

---

*Resume marker: when a phase is fully green and committed, note it in `docs/COMMAND_CENTRE.md`
decision log and move to the next. Sources: `docs/IMPLEMENTATION_PLAN_MVP.md`, `READINESS.md`,
`DECISIONS.md`, `COMMAND_CENTRE.md`.*
