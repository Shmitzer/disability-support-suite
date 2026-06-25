# Caira — Overnight Build Runbook

A **checkpointed work queue** for the two autonomous roles — **cc** (Claude Code,
logic in `src/`) and **cd** (Claude Design, prototypes in `docs/design/`) — built off
Edward's locked decisions. Every task is **atomic**: it ends green and committed, ticks
the ledger, and leaves a "Next up" pointer, so a fresh session that runs out of tokens
can read the ledger + last commit and carry on with **zero context loss**.

> **Canonical status doc is still `docs/COMMAND_CENTRE.md`** (on `main`). This runbook is
> the *queue*; the command centre is the *snapshot*. When a task lands, update both:
> tick the ledger here, add a decision-log line there (ccu).

---

## ▶ Resume protocol (read this first, every session)

1. **Reattach.** `git fetch origin && git checkout claude/ecstatic-maxwell-i094f9 &&
   git pull`. Read **"Next up"** below and the last 3 commits (`git log --oneline -3`).
2. **Restore the toolchain.** Fresh containers have no `node_modules` — run `npm ci`
   (or `npm install`) **before** trusting `tsc`. A bare-container `tsc` fails only on
   `Cannot find name 'node:test'` / missing `@types/node`; that is *not* a real break.
3. **Confirm green baseline** (headless — no live DB/keys in the sandbox):
   `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build`
   (`build` runs `prisma generate` first). If any is red **before** you start, fix that
   first — never stack new work on a red tree.
4. **Pick the first unchecked task** for your role in the queue below. Do only that one.
5. **Definition of done (atomic, non-negotiable):**
   - `tsc` ✓ · `lint` ✓ · `npm test` ✓ · `build` ✓ (all headless).
   - Any schema change goes to a **new `prisma/sql/*.sql` file + `schema_baseline.sql`**
     and is **NOT applied** to the live DB (Edward-gated — see the fence). Code must
     **degrade gracefully** when the table/column is absent.
   - Pure logic is **unit-tested** (`test/*.test.ts`, `tsx --test`).
   - **Commit** with a clear message. Tick the ledger row. Rewrite **"Next up"**.
   - ccu: add a decision-log line to `docs/COMMAND_CENTRE.md` on `main`.
6. **If blocked**, write the blocker under *Notes & blockers*, leave the row unchecked,
   and move to the next task. Never guess on an Edward-gated item — stop and flag it.

**Hard rules** (never break, even to "finish" a task): no `db push` / `--force-reset`
on the live DB · never enter or rotate credentials · scrub PII before any external API
(Rule 2) · keep all 12 architectural rules (`COMMAND_CENTRE.md`). Skip anything that
needs a new key or a human decision — it lives behind the fence.

---

## 📋 Progress ledger

Tick when the task lands green + committed. Newest work appended under *Notes*.

### cc — logic (`src/`, owner: Claude Code)
- [ ] **cc-1 · Participant record + NDIS plan fields (#4).** Flesh out the thin
  Participant object: plan start/end dates, funding categories, goals. Model +
  server actions + resilient reads. Unblocks cc-2 and budget tracking. Schema →
  `prisma/sql/participant_plan.sql` (+ baseline), unapplied.
- [ ] **cc-2 · `anonymiseUser()` right-to-erasure.** Depends on cc-1 (needs the full
  NDIS Participant fields first). Soft-delete / anonymise path for data-subject erasure
  (OAIC / Privacy Act). Pure-tested; audited (Rule 9). Closes the last open pre-real-user
  gate item.
- [ ] **cc-3 · Populate `activitiesLog` / `incidentFields`.** These columns exist but no
  app code writes them yet (noted in COMMAND_CENTRE "Schema — done vs deferred"). Wire
  the capture/incident flows to populate them; keep reads resilient.
- [ ] **cc-4 · Verify Phase-5 competency gating end-to-end.** `#7 credentials`
  (`WorkerCredential`) is done and `workerMayLogNeed` wires the deferred hook — confirm
  the high-intensity chip gate (`HIGH_INTENSITY_NEEDS`/`isHighIntensitySupport`) actually
  blocks an un-credentialed worker and is audited. Add the acceptance test if missing.

### cd — design (`docs/design/`, owner: Claude Design)
- [ ] **cd-1 · `Caira Modules.dc.html`.** Build the module-gallery prototype to the
  HANDOFF spec: six-module grid (Shift Tracker = Available now; Incident / Medication /
  Messaging & On-call / Coordinator Dashboard / Reporting & Compliance = Soon), "one
  connected record" band, "Inside Shift Tracker" cards, CTA. 1200px, Sage & Clay,
  `.dc.html` Design-Component format. Add a screenshot.
- [ ] **cd-2 · `Caira Pricing.dc.html`.** Full-brand pricing page (currently low-fi only):
  plans (lead `$9/worker`), FAQ, CTA. Screenshot + HANDOFF entry.
- [ ] **cd-3 · Reconcile `Caira Home` into `.dc.html`.** The landing exists as
  `mockups/caira-home.html` + `src/app/(public)/page.tsx` but has **no committed
  `.dc.html` prototype** (HANDOFF "Sync gap"). Promote it to a real Design Component so
  design and impl stop drifting.
- [ ] **cd-4 · Design the shipped-but-undesigned product surfaces.** cc has shipped logic
  for features with **no designed UI**: incident register, eMAR/medication, credentials,
  care-task/ADL checklist, messaging + handover, reporting/exports, notifications, the
  `/admin` + `/admin/settings` + auth routes. Produce `.dc.html` screens (or extend the
  Tablet/Web canvas) **one surface per atomic task**, then hand to cc to wire `src/` to
  match (design-first, per CLAUDE.md).

> After each cd task lands a prototype, the matching `src/` build-to-match is a follow-on
> cc task — log it under *Notes* so it isn't lost.

---

## 🚧 Next up

**cc:** cc-1 — Participant record + NDIS plan fields (#4). Start here; it unblocks cc-2.
**cd:** cd-1 — `Caira Modules.dc.html` from the HANDOFF spec.

(Last verified baseline: headless `tsc`/`lint`/`build` green + `npm test` once
`node_modules` is restored. ~122 test cases across `test/*.test.ts`.)

---

## 🔒 Edward-gated — DO NOT ATTEMPT (fenced off)

Agents must **never** do these. Note when a task is *ready* for one and stop.

- **Live DB apply.** All `prisma/sql/*.sql` that ship "unapplied" stay unapplied by
  agents. Edward applies them by hand (Supabase SQL Editor / `prisma db push` on the
  laptop), in dependency order, per `docs/PRODUCTION_CUTOVER.md` / `docs/PHASE_F.md`.
  Current unapplied set includes: `learned_options_per_org`, `audit_hash_chain`,
  `rbac_grants`, `participant_care_profile`, `note_extraction`, `org_auto_suggest_cap`,
  `care_tasks`, `credentials`, `incidents`, `messaging`, `documents`,
  `notifications_med_evv_billing` (+ any new `*_plan` / `*_anonymise` files from cc-1/cc-2).
- **Keys / credentials.** Stripe, Resend, PostHog, Sentry, Upstash, Gemini, Supabase
  service-role — never entered, set, or rotated by agents. Code stays env-gated + inert
  without them.
- **Password / secret rotation.** Human-only.
- **Lawyer / legal review.** The `/privacy` enterprise draft (13 sections) stays marked
  *Draft — not in effect* until legal sign-off + placeholder fill (entity, contact,
  sub-processors, retention). Agents don't flip it live.
- **Deploy / Vercel env + Supabase dashboard toggles + tester invites.** Per the
  SOFT LAUNCH section of `COMMAND_CENTRE.md`. Human-only.

---

## Notes & blockers

_(append as work proceeds — newest first)_

- **2026-06-25** — Runbook created. Queue derived from `docs/backlog.md` (CC logic items
  #1/#2/#3/#7 already done; remaining cc-startable without a decision = #4 + erasure +
  unpopulated columns + competency-gate verify), `docs/design/HANDOFF.md` (Modules /
  Pricing / Home-`.dc.html` / undesigned product surfaces), and the COMMAND_CENTRE gate.
  Decision-gated backlog items (#9 offline, NDIS price-guide feed, embeddings provider,
  server TTS) are **out of the queue** until Edward locks the decision.
