# Caira — Full Functional Readiness Analysis

**What it would take to make Caira functional across its entire scope**, mapped to who does
each step: **cc** (Claude Code — backend/logic/wiring) · **cd** (design agent — UI/screens) ·
**You** (Edward — decisions, credentials, ops, legal). Generated 2026-06-26.

---

## TL;DR — the one thing to understand

Almost all the **feature logic is already written** (server actions + pure, tested helpers in
`src/lib/`). What stops the app being functional end-to-end is **not** missing code — it's that
each feature is gated behind up to four locks:

1. **Unapplied SQL** — ~13 feature tables exist only as checked-in `prisma/sql/*.sql`, *not yet
   applied* to the live DB. The code degrades gracefully (feature silently inert) until applied.
2. **Undesigned UI** — most features have **no screen** yet. cd owns this (per the design-SSOT
   convention: design in `docs/design/` first, then cc builds React to match).
3. **Unwired UI** — once a screen is designed + SQL applied, cc wires the React page to the
   existing server action.
4. **Your decisions** — a handful of scope/channel/region/pricing calls block clean building.

So the repeating unlock per feature is: **You decide → cc applies SQL → cd designs → cc builds UI.**
Plus a separate **legal/compliance gate** that must clear before any *real* participant data.

---

## A. Go-live foundation (infrastructure & ops) — mostly You

| Step | Owner | Notes |
|---|---|---|
| Build green on Vercel | ✅ done | `e9ffe44`, Ready |
| Supabase live + seeded + SQL baseline applied | ✅ done | schema_baseline → grants → search_vector → auth_hook → rls v1+v2 |
| Supabase JWT claims hook enabled | ✅ done | `custom_access_token_hook` |
| Auth URL config (Site URL → Vercel) | ✅ done | fixed the localhost bounce |
| **`AUTH_ALLOWLIST`** (5 tester emails) in Vercel | **You** | the soft-launch gate; unset = anyone can sign in |
| **Remove `DEV_AUTH`** from Vercel Production | **You** | inert in prod, but the handoff says don't set it |
| **Custom SMTP (Resend)** + verify `caira.net.au` in Resend (DNS) | **You** | built-in email is rate-limited + dev-only; needed for real testers |
| **Rotate the exposed DB password** | **You** | flagged in the doc set as a pre-go-live security task |
| Redeploy after env changes | **You** | env edits only take effect on a new deploy |
| Point `caira.net.au` at Vercel (DNS) + add to Supabase URLs | **You** | optional for testers; do before public launch |
| **Super-admin / your ADMIN account** | **You** | log in once → run the `role='ADMIN'` SQL (in progress) |

---

## B. Database — apply the remaining feature SQL

These tables back features whose **logic is already written** but which are inert until applied.
cc will hand you the exact ordered apply script (à la the cutover runbook); you paste it into the
Supabase SQL editor (the convention is by-hand apply, **not** `db push`).

`care_tasks` · `incidents` · `credentials` · `notifications_med_evv_billing` · `messaging` ·
`documents` · `assistant` · `note_extraction` · `participant_care_profile` · `org_auto_suggest_cap`
· `audit_hash_chain` · `rbac_grants` · `learned_options_per_org`

- **You:** run the apply script in Supabase; re-run `verify_rls_editor.sql` after.
- **cc:** produce the ordered apply script + a post-apply RLS check for the new tables.

> Note: `audit_hash_chain` should be applied **before** real use so the tamper-evident audit
> chain actually persists. `rbac_grants` is needed for participant-scoped / family access.

---

## C. Feature matrix — logic ✅, what each still needs

Every row's **logic is done by cc**. Columns show what remains. "Apply SQL" = section B.

| # | Feature | Apply SQL | cd (design UI) | cc (wire UI) | Your decision |
|---|---|---|---|---|---|
| 1 | Shift capture — chips, detail panels | applied | refine | — | — |
| 2 | Voice capture + live transcription | — | **mic button + audio playback UI** | wire | — |
| 3 | Note → structured entries (extract→review) | `note_extraction` | review-list UI | wire | — |
| 4 | AI clarifying prompts + per-shift cap | `org_auto_suggest_cap` | prompt chips UI | wire | — |
| 5 | Participant care-profile chips | `participant_care_profile` | profile editor UI | wire | — |
| 6 | Timestamp accuracy (back-logged entries) | — | time-prompt UI | wire | — |
| 7 | Supervisor note approval | applied (rbac) | approval UI | wire | — |
| 8 | Task / ADL checklist per shift | `care_tasks` | **checklist UI** | wire | — |
| 9 | Incident register + reportable workflow | `incidents` | **register + form UI** | wire | severity/notify rules |
| 10 | Medication chart + eMAR | `notifications_med_evv_billing` | **eMAR UI** | wire | **scope: full vs lite** |
| 11 | Worker credentials + expiry → competency gate | `credentials` | credentials UI | wire | — |
| 12 | In-app notifications | (incl. above) | **notif center UI** | wire | **channel: in-app/email/push** |
| 13 | Messaging + shift handover | `messaging` | **chat + handover UI** | wire | — |
| 14 | Budgets + billable items + claim CSV | (incl. above) | budgets/claims UI | wire | **NDIS price-guide source** |
| 15 | EVV (geo at clock on/off) | (incl. above) | EVV consent UI | wire | **AU now vs US-only later** |
| 16 | Reporting / KPIs / CSV exports | applied | dashboards UI | wire | — |
| 17 | Caira assistant ("your friend") + docs/OCR | `assistant`, `documents` | assistant UI | wire | **embeddings provider** |
| 18 | Auth: password + device PIN (post magic-link) | applied | settings UI | wire | — |
| 19 | Analytics consent gate | — | **consent banner** | wire | — |

---

## D. New surfaces — largely undesigned (cd-heavy, then cc)

The worker app `(protected)` and a mock `/admin` exist. These whole surfaces from the IA do not:

- **`/console`** (coordinator/admin desktop) — expand the `/admin` mock into the real dashboard,
  participant records + NDIS plan fields, roster, incidents, reports, org settings, documents.
  → **cd** designs each screen → **cc** builds + wires.
- **`/portal`** (participant & family/guardian) — read-only care feed, family med/routine submit,
  documents, consent step. *Brand new.* → cd then cc. **Gated by the legal consent model.**
- **`/platform`** (SUPERADMIN internal) — cross-org admin. Also requires cc to **wire the
  platform-admin override into the legacy gates** (today `SUPERADMIN` has no capabilities in the
  live gates — see your super-admin note).
- **Cross-cutting pages** — account/user settings, org settings expansion, participant/org
  documents, `not-found.tsx` (404), `error.tsx` (500), offline/PWA fallback, changelog. → cd + cc.

---

## E. Marketing & brand

- **Sales site** exists (`Caira Sales Site.dc.html`, Direction B). **You:** set real pricing, give
  the CTA target URL (signup/waitlist). **cd:** lock Direction B, hide the dev switcher.
  **cc:** reconcile the React landing page (`src/app/(public)/page.tsx`) to the sales site.
- **Wordmark/logo** finalised (Mark-i) and landed in `docs/design/`. **cc:** adopt the shared logo
  component in nav/footer/mockups in `src/`.
- **Modules gallery + Pricing page** — specced, not designed. cd then cc.

---

## F. Legal & compliance — the HARD gate (before any real participant data)

Soft launch on **dummy data** does **not** need these. Onboarding a **real participant does.**
Owner: **L** legal (NDIS lawyer + you) · **P** copy · **cd** placement · **cc** wiring/logging.

1. **Privacy Policy** finalised (AI processing, PII scrub, cross-border APP 8, Sydney residency,
   no-AI-training, 7-yr retention, erasure) → publish `/privacy`, version + effective date logged.
2. **Provider Terms of Service** (B2B) → `/terms`, acceptance logged at org onboarding.
3. **DPA + sub-processor list** (Supabase, Gemini, Resend, Vercel, Stripe, PostHog, Sentry) → `/dpa`.
4. **Dual-role authority-to-access consent** (the NLS/Zef/mother case) → wire to
   `ParticipantAccessGrant` + `Consent`, store signed consent + timestamp.
5. **Participant privacy notice** (Easy Read) → shown on first portal view, acknowledgement captured.
6. **Data-breach response plan** (OAIC NDB) → internal runbook + console summary.
7. **AI in-page disclaimers** — resolver done (`notices.ts`); needs **P** copy + **cd** placement.
8. **`anonymiseUser()` right-to-erasure** — deferred; needs full NDIS Participant fields first (cc).

---

## Consolidated to-do by owner

### cd (design) — the critical path
Voice/audio UI · note review-list · care-profile editor · ADL checklist · incident register+form ·
eMAR · notification center · messaging+handover · budgets/claims · EVV consent · reporting
dashboards · assistant UI · analytics consent banner · **the whole `/console`, `/portal`,
`/platform` surfaces** · 404/500/offline pages · lock sales-site Direction B · Modules + Pricing pages.

### cc (Claude Code) — backend/wiring
Produce the ordered SQL apply script (§B) · wire each designed screen to its server action (§C) ·
wire platform-admin override into legacy gates (§D) · adopt the logo component + reconcile the
landing page to the sales site (§E) · build `anonymiseUser()` + participant NDIS-plan fields ·
log ToS/DPA/consent acceptance (§F).

### You (Edward) — decisions, ops, legal
Answer the batch decisions below · set `AUTH_ALLOWLIST`, remove `DEV_AUTH`, custom SMTP, rotate DB
password, Upstash keys, AI budget cap, Stripe keys, photo bucket, Sentry/PostHog/Resend keys ·
run the SQL apply script · wire the domain · **engage an NDIS lawyer** for the §F gate.

---

## Batch decisions — answer these in one go to unblock cd + cc

Answering all of these at once lets cc/cd run without stopping to ask. Reply by number.

1. **Notification channel** — in-app only / + email (Resend) / + web push? (P0 #5)
2. **eMAR scope** — full medication chart, or lightweight due/given/PRN? (P1 #6)
3. **Billing/claims** — what's the NDIS price-guide source? Support US payers too? Default region = AU? (P1/P2 #8/#13)
4. **EVV/GPS** — enable for AU now, or keep US-only-later? (P2 #11)
5. **Assistant embeddings** — which cheap provider, and is it in-scope now or later? (P2 #14)
6. **Offline mode** — priority now, or later? (P1 #9)
7. **Sectors at launch** — NDIS only, or also aged care / mental health / community? (drives `sectorConfig`)
8. **Default participant term** — "participant" / "client" / "resident"?
9. **Pricing** — plan, price, interval, trial length, per-worker model, the "20% promise"? (blocks Stripe + sales site)
10. **Launch integrations** — which of Stripe / Sentry / PostHog / Resend are ON at first real launch? + `EMAIL_FROM` and sending domain.
11. **Domain** — wire `caira.net.au` to Vercel now, or stay on `*.vercel.app` for the trial?
12. **Super-admin** — do you want the true cross-org `SUPERADMIN` seat wired (cc change), or is org `ADMIN` enough for now?
13. **Real-data timeline** — roughly when do you want a real participant onboarded? (sets the §F legal-gate deadline)
14. **Legal** — is an NDIS-savvy lawyer engaged yet for the privacy/ToS/DPA/consent set?

---

*Sources: `docs/COMMAND_CENTRE.md`, `docs/backlog.md`, `docs/pre-launch-doc-checklist.md`,
`docs/design/information-architecture.md`, `prisma/schema.prisma`, `prisma/sql/`, `src/lib/`.*
