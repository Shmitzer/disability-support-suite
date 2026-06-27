# Caira — Implementation Plan: First Customer → Enterprise

**Owner:** Edward (PM) · **Build roles:** cc (Claude Code — backend/logic/wiring in `src/`) ·
cd (design — `docs/design/` SSOT) · You (decisions, credentials, ops, legal).
**Written:** 2026-06-27. **Supersedes** ad-hoc planning; complements `READINESS.md` +
`DECISIONS.md` (do not re-litigate locked decisions there).

---

## 0. Plan parameters (decided 2026-06-27)

| # | Question | Decision | Effect on plan |
|---|---|---|---|
| A | Immediate focus | **First-customer MVP first** | Sequence concentrates cc/cd on revenue MVP; enterprise is Phase 2. |
| B | Customer #1 profile | **Mid-size (needs `/console`)** | The coordinator desktop `/console` is **in the MVP**, not deferred. Bigger Phase 1. |
| C | Legal documents | **cc scopes/drafts now** | Legal-draft track runs in parallel; lawyer reviews rather than starts cold. |
| D | Pricing | **Help figure it out** | A pricing-analysis workstream runs in parallel; Stripe wired once numbers land. |

These sit on top of the 14 locked decisions in `DECISIONS.md` (NDIS-only, "Participant",
all-three notifications, lite eMAR, AU price-guide feed, EVV off, offline = build, all four
integrations on, multi-model pricing, wire domain, both admin tiers, real data in weeks,
no lawyer yet).

---

## 1. The shape of the plan

Three sequential phases plus three parallel tracks. The **legal track is the critical path** to
real revenue — it gates real participant data, which is wanted in weeks, and no lawyer is engaged.

```
Phase 0  Foundation hardening + ops      (cc + You; no design needed)      ── unblocks everything
Phase 1  First-customer MVP              (cd → cc; incl. /console)         ── the revenue build
Phase 2  Enterprise expansion           (cd → cc)                         ── after first revenue

Parallel ── Legal docs (cc draft → Lawyer → You)   ← CRITICAL PATH
Parallel ── Pricing analysis (research → You)       → unblocks Stripe + sales page
Parallel ── Caira character (cd from Drive → cc)    → brand/retention layer, low legal risk
```

**Gate rule (unchanged):** dummy data needs none of the legal set; a **real participant needs the
full §F legal gate cleared first.** Social/multiplayer stay flag-off regardless.

---

## 2. Phase 0 — Foundation hardening + ops (start immediately)

No design dependency. This is the "make it safe to take money and real data" layer. Most are the
must-fix items from the strategic review plus the ops list from READINESS §A/§B.

**You (ops/credentials):**
- Rotate the exposed DB password; update `DATABASE_URL`/`DIRECT_URL` everywhere. *(recurring security flag — do first)*
- Resend SMTP + verify `caira.net.au` in Resend (DNS) — needed before inviting more than a couple testers.
- Provision keys: Stripe (secret/price/webhook), Upstash (rate-limit), Sentry DSN, PostHog key, VAPID keypair (web push), private `shift-photos` bucket.
- Run the SUPERADMIN elevation SQL for your account; create a 2nd account + ADMIN SQL for provider-view testing.
- Run the **ordered SQL apply script** (from cc) in the Supabase SQL editor by hand; re-run `verify_rls_editor.sql` after.

**cc (backend):**
- Produce the single **ordered SQL apply script** for the ~13 unapplied feature tables (`care_tasks`, `incidents`, `credentials`, `notifications_med_evv_billing`, `messaging`, `documents`, `assistant`, `note_extraction`, `participant_care_profile`, `org_auto_suggest_cap`, `audit_hash_chain`, `rbac_grants`, `learned_options_per_org`) + a post-apply RLS sweep for the new tables. Apply `audit_hash_chain` + `rbac_grants` first.
- Commit the pending `rbac.ts` SUPERADMIN wiring (+ tsc/lint/build).
- Wire the rate-limiter live + a budget alarm/spend cap (currently scaffolded, inert without Upstash).
- Add a **CI guard that fails on unscoped tenant-table reads** (the RLS bypass via Prisma is load-bearing).
- Confirm all four integrations flip on via env-gating; PostHog stays behind the consent banner.
- MFA + full audit on the SUPERADMIN seat; never the default login.

**Exit criteria:** green `tsc/lint/build/test`; all feature SQL applied + RLS swept; secrets rotated and managed; rate-limit + spend cap live; CI tenant-scope guard passing.

---

## 3. Phase 1 — First-customer MVP (mid-size provider)

Goal: a real mid-size NDIS provider can run daily operations — workers capture shifts, coordinators
manage participants/roster/incidents/reports, the org subscribes and pays. Per the design-SSOT
convention, **cd designs each screen in `docs/design/` first, then cc wires it** to the existing
server action.

### In scope for MVP
1. **Worker app polish** — finish UI for the already-built logic: voice/audio capture, note→entries review list, AI clarifying prompts, care-profile chips, timestamp prompts, supervisor approval.
2. **`/console` (coordinator desktop)** — the big MVP item. Expand the `/admin` mock into the real dashboard: participant records + NDIS plan fields, roster, incident register, reports/KPIs + CSV export, org settings, documents.
3. **Incident register + reportable workflow** — compliance-critical for NDIS providers.
4. **Lite eMAR** — due/given/withheld/refused/PRN (full chart deferred).
5. **Worker credentials + expiry** → competency gating + compliance reminders.
6. **Notifications** — in-app for MVP launch; email (Resend) + web push wired but can phase in.
7. **Reporting / KPIs / CSV exports.**
8. **Billing** — Stripe subscribe → portal → cancel, provider-tier products (gated on Pricing track).
9. **Analytics consent banner** (gates PostHog) + AI in-page disclaimers (copy + placement).
10. **404/500 pages** + minimal `/platform` SUPERADMIN for your cross-org admin.

### Deferred to Phase 2 (not in first-customer MVP)
`/portal` (participant + family — legally gated) · offline/PWA + sync (large) · messaging + handover
· budgets/claims + NDIS price-guide importer · full eMAR · EVV.

### Exit criteria
A pilot provider org can be onboarded on **real data** (legal gate cleared), workers log full shifts,
coordinators run the console end-to-end, incidents + meds + credentials tracked, reports export,
the org is billed. Smoke tests: RLS BOLA (org-A can't read org-B), Stripe lifecycle, photo
add/reload (paths not base64).

---

## 4. Phase 2 — Enterprise expansion (after first revenue)

Sequenced per the strategic review (revenue → moat → compliance depth → social last).

- **`/portal`** (participant + family/guardian) — read-only care feed, family med/routine submit, documents, consent step. Gated by the legal consent model.
- **Offline / PWA + sync** — service worker, local queue, sync-on-reconnect (idempotency keys exist). Large client build (you chose build-now; sequenced here to not delay first revenue).
- **Messaging + shift handover.**
- **Budgets + billable items + claim CSV** — AU NDIS price-guide importer (periodic NDIA spreadsheet file, no public API).
- **Enterprise depth** — SSO, Xero/payroll, SCHADS award interpretation, auto-generated NDIS report/PDF packs, plan budget burn-down dashboards, white-label multi-org tier (the bull-case path).
- **Full `/platform`** cross-org admin.
- **Caira character** continues maturing across all surfaces (see parallel track).

**Stay dark behind flags until a dedicated safeguarding + child-safety build:** participant social
connections, multiplayer games. Therapeutic single-player games + the character may ship as
differentiation.

---

## 5. Parallel tracks

### Track L — Legal (CRITICAL PATH)
- **You:** engage an NDIS-savvy lawyer **now** — this is the longest pole and gates real data.
- **cc:** scope the legal brief + draft starting points for: privacy policy (AI processing, PII scrub, APP 8 cross-border, Sydney residency, no-AI-training, 7-yr retention, erasure), provider ToS (B2B), DPA + sub-processor list (Supabase/Gemini/Resend/Vercel/Stripe/PostHog/Sentry), dual-role authority-to-access consent. Wire ToS/DPA/consent acceptance logging to `ParticipantAccessGrant` + `Consent`.
- **Lawyer → You:** review/finalise; publish `/privacy`, `/terms`, `/dpa` with version + effective date logged.
- Also needed: get the **NDIS platform classification ruling** (digital platform vs back-end SaaS) — shapes ToS + marketing.

### Track P — Pricing analysis
- **Research workstream** (I can run this): NDIS-provider-software market + competitor scan → defensible per-worker / per-participant / org-tier price points, trial length, the "20% promise" framing.
- **You:** approve final numbers.
- **cc:** build Stripe products/prices for each model once numbers land. **cd:** segmented pricing on the sales site.

### Track C — Caira character
- **cd:** pull the Master Handover from Google Drive → design character placement + reactive states per surface (nav/home, shift capture, voice/AI, console, portal) as `.dc.html` + screenshots + `HANDOFF.md`.
- **cc:** build the character component in `src/` (pure SVG/CSS/React, no new deps, no legal gate) and wire reactive states to real actions.
- Low legal risk, high brand/retention upside — layer it in alongside Phase 1 surfaces.

---

## 6. Batched instructions

### → For cc (Claude Code)
Copy this batch into the cc session. Respect the 12 architectural rules + design-SSOT.

**Phase 0 (do first, no design needed):**
1. Produce the single ordered SQL apply script for the 13 unapplied tables + post-apply RLS sweep; `audit_hash_chain` + `rbac_grants` first.
2. Commit the pending `rbac.ts` SUPERADMIN wiring; verify tsc/lint/build.
3. Wire the rate-limiter live + budget alarm/hard spend cap.
4. Add a CI guard failing on unscoped tenant-table reads.
5. Confirm env-gating flips all four integrations on; MFA + audit the SUPERADMIN seat.

**Phase 1 (wire after each cd screen lands):**
6. Wire each MVP screen to its existing server action: voice capture, note-extract review, AI prompts, care-profile editor, timestamp prompts, supervisor approval, incident register, lite eMAR, credentials, in-app notifications, reporting/CSV, analytics consent banner, AI disclaimers.
7. Build out `/console` data + wiring (participant records + NDIS plan fields, roster, incidents, reports, org settings, documents) behind capability gates.
8. Stripe products/prices + subscribe→portal→cancel + webhook→audit (once Pricing track delivers numbers).
9. Minimal `/platform` SUPERADMIN; wire platform-admin override into any legacy gates that lack it.
10. `anonymiseUser()` right-to-erasure + the full NDIS Participant fields it depends on.

**Track L (parallel):**
11. Scope the legal brief + draft privacy/ToS/DPA/consent starting points; wire ToS/DPA/consent acceptance logging to `ParticipantAccessGrant` + `Consent`.

**Phase 2 (after first revenue):** `/portal` build, offline/PWA + sync, messaging + handover, NDIS price-guide importer + claims CSV, enterprise integrations (SSO/Xero/SCHADS), NDIS report/PDF pack generator, full `/platform`.

### → For cd (design)
Copy this batch into the cd session. Design in `docs/design/` first (`.dc.html` + screenshots +
`HANDOFF.md`); cc builds `src/` to match. Don't let design and `src/` drift.

**Phase 1 — MVP screens (critical path for the build):**
1. Worker-app feature UIs: voice/audio (mic + playback), note review-list, AI prompt chips, care-profile editor, timestamp prompt, supervisor approval.
2. **The whole `/console` surface** — coordinator desktop: participant records + NDIS plan fields, roster, incident register + reportable form, reports/KPIs dashboards + CSV, org settings, documents.
3. Incident register + form, lite eMAR UI, worker credentials UI, in-app notification center, analytics consent banner, 404/500 pages.
4. Lock the sales-site **Direction B**, hide the dev switcher; design Modules gallery + segmented Pricing page (numbers come from the Pricing track).
5. Adopt the finalised Mark-i logo component across nav/footer/mockups.

**Track C — Caira character (parallel):**
6. Pull the Master Handover from Drive → design character placement + reactive states per surface as `.dc.html` + screenshots + `HANDOFF.md`.

**Phase 2 (after first revenue):** `/portal` (participant + family) screens, offline/PWA UX + sync states, messaging + handover, budgets/claims UI, EVV consent UI, enterprise dashboards.

---

## 7. Your action list (Edward)

**Critical path:**
- [ ] Engage an NDIS-savvy lawyer (gates real participant data).

**Phase 0 ops (this week):**
- [ ] Rotate the DB password; update connection strings everywhere.
- [ ] Resend SMTP + verify `caira.net.au` (DNS).
- [ ] Provision keys: Stripe, Upstash, Sentry, PostHog, VAPID, `shift-photos` bucket.
- [ ] Run cc's ordered SQL apply script in Supabase; re-run the RLS verify.
- [ ] Run SUPERADMIN elevation SQL; create + elevate a test ADMIN account.
- [ ] (Laptop) rebuild the corrupted git index, `git pull origin main`, commit pending `rbac.ts`.

**Decisions still owed:**
- [ ] Approve final pricing numbers (after the Pricing track delivers analysis).
- [ ] Confirm which NDIA price-guide file/version to import (Phase 2).
- [ ] Review the lawyer-finalised legal docs before publishing.

---

## 8. Suggested order of operations (next 2–4 weeks)

1. **Today:** start Track L (book lawyer) + Track P (pricing analysis) — the two longest leads.
2. **This week:** cc runs Phase 0 backend; You run Phase 0 ops in parallel.
3. **Then:** cd starts Phase 1 screens (worker UIs → `/console`); cc wires as each lands.
4. **As legal clears + MVP wires up:** onboard the pilot mid-size provider on real data.
5. **After first revenue:** open Phase 2.

*Sources: `docs/READINESS.md`, `docs/DECISIONS.md`, `docs/COMMAND_CENTRE.md`,
`docs/STRATEGIC_REVIEW.md`, `docs/SESSION_RESUME_2026-06-26.md`.*
