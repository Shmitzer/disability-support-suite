# Caira — overnight autonomous build runbook (2026-06-26)

A resumable build queue for **cc** (Claude Code — logic/wiring) and **cd** (design). Built to
run unattended overnight and **survive token/context limits**: every task is atomic, ends green,
commits, and ticks the ledger — so a fresh session can read the ledger and continue with zero
context loss. Scope inputs: `docs/DECISIONS.md` (locked answers) + `docs/READINESS.md` (the map).

---

## ⛑ RESUME PROTOCOL — read this first, every session

If you are a fresh cc or cd session picking this up:

1. **Read** `docs/DECISIONS.md`, this file's **Progress ledger** (below), and `git log --oneline -15`.
2. Find the **first unchecked task** in your lane (cc or cd) whose dependencies are ✅. Do that one.
3. **One task = one commit.** Never leave the tree half-built at a context boundary.
4. **Definition of done per task:** `tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓ (cc);
   for cd, the `.dc.html` renders + a screenshot in `docs/design/screenshots/`. Then:
   - tick the ledger box here,
   - add a one-line `docs/COMMAND_CENTRE.md` decision-log entry (canonical on `main`),
   - `git commit`.
5. **If you feel context running low:** STOP at the current green checkpoint — do **not** start a
   new task. Commit, tick the ledger, and write the next pointer in "Next up" below. Exit cleanly.
6. **Never** apply SQL to the live DB, touch real participant data, or push secrets. DB apply +
   credentials + the live domain are **Edward-gated** (flagged ⛔ below). Build against dummy data.

## Guardrails (never break)
- The **12 architectural rules** in `COMMAND_CENTRE.md`. (AI only via `src/lib/ai.ts`; PII scrub;
  relative storage paths; `sectorConfig` labels; `organisationId` nullable; no SQLite in prod;
  real auth; local-state backup; audit every sensitive action; `userId`+`organisationId?` on new
  tables; validate LLM output; idempotency keys.)
- **Design-SSOT convention:** cd designs in `docs/design/` *first*; cc builds React in `src/` to
  match. No standalone render-outside-the-app components.
- **Dummy data only.** No real participant data until the legal gate (`pre-launch-doc-checklist.md`).

---

## 📋 Progress ledger  (tick as you go; this is the resume state)

### cc lane (logic / wiring / new builds)
- [ ] **C0** Commit pending working-tree edits cleanly: `rbac.ts` SUPERADMIN wiring, `docs/*`,
  design files, `package.json` rename. (Fix the corrupted index first: `del .git\index` → `git reset`.) Green check.
- [ ] **C1** Produce the ordered **SQL apply script** for the unapplied feature tables (READINESS §B)
  → `prisma/sql/apply_all.sql` + a dry-run note. ⛔ *Edward applies to live DB.*
- [ ] **C2** eMAR **lite** (Q2): due / given / withheld / refused / PRN actions + pure tests. (Full chart deferred.)
- [ ] **C3** Notifications **delivery** (Q1=all three): in-app (have) + **email send** via Resend
  templates + **web-push** scaffolding (service worker registration, VAPID key plumbing, subscribe action). ⛔ *VAPID keys = Edward.*
- [ ] **C4** **Offline / PWA** (Q6): service worker, local write-queue, sync-on-reconnect using the
  existing idempotency keys; offline state in server actions. (Large — split into C4a sw+cache, C4b queue+sync.)
- [ ] **C5** **Multi-model pricing** (Q9): Stripe products/prices for per-worker · per-participant ·
  org-tier; plan config in `billing.ts`; checkout/portal wiring. ⛔ *Stripe keys + price points = Edward.*
- [ ] **C6** Participant **NDIS plan fields** (plan dates, funding categories, goals) on the record + `anonymiseUser()` erasure (READINESS §F8).
- [ ] **C7** NDIA **price-guide importer** (Q3): parse the pricing-arrangements spreadsheet → billable line-item codes. ⛔ *Edward nominates the file/version.*
- [ ] **C8** Reconcile `src/app/(public)/page.tsx` to `Caira Sales Site.dc.html`; adopt the shared **logo component** (Mark-i) in nav/footer.
- [ ] **C9** Draft the **legal brief** + starting-point drafts (privacy policy, provider ToS, DPA + sub-processor list, dual-role consent) → `docs/legal/` for lawyer review. (Critical path — Q13/Q14.)

### cd lane (design → `docs/design/`)
- [ ] **D0** Lock **sales site** Direction B: hide the dev switcher, set `initialDirection=B`; leave CTA URL as a prop for Edward.
- [ ] **D1** Worker-app feature screens (mobile-first): voice/audio capture + playback; note review-list; care-profile editor; ADL checklist; **incident register + reportable form**; eMAR-lite; **notification center + push-permission prompt**; messaging + handover; budgets/claims; assistant UI; **analytics consent banner**.
- [ ] **D2** **`/console`** (coordinator desktop): expand the `/admin` mock → dashboard, participant record + NDIS plan, roster, incidents, reports, org settings, documents.
- [ ] **D3** **`/portal`** (participant + family/guardian): read-only care feed; family med/routine submit; documents; **consent step**. (Gated by the legal consent model.)
- [ ] **D4** **`/platform`** (SUPERADMIN internal): cross-org admin views.
- [ ] **D5** System/state pages: `not-found` (404), `error` (500), **offline/PWA fallback**; Modules + Pricing marketing pages.

### Recommended order
cc: **C0 → C2 → C3 → C6 → C4 → C5 → C8 → C7 → C9** (C1 anytime; Edward-gated steps prepped not applied).
cd: **D0 → D1 (incident + notif first) → D2 → D5 → D3 → D4.**
cc and cd run in parallel; cc wires a screen only after cd has committed its `.dc.html`.

---

## Next up (pointer for the next session)
> _Last session leaves this filled in._ Start state: nothing done yet — begin at **C0** (cc) and **D0** (cd).

## ⛔ Edward-gated (do not attempt autonomously)
Apply SQL to live DB · VAPID/Stripe/Resend/Sentry/PostHog keys · rotate DB password · wire
`caira.net.au` DNS · `AUTH_ALLOWLIST` · nominate the NDIA price-guide file · engage the lawyer.
