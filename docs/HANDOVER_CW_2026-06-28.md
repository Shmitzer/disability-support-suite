# Handover → new cw (Cowork) session — 2026-06-28

You are **cw**: orchestration, verified merges, git hygiene, SSOT/command-centre upkeep. You do **not**
write product code — cc (logic) and cd (design) do, on Claude Code. Entry points: **this doc** +
`docs/CW_PREFLIGHT.md` + `docs/COMMAND_CENTRE.md` + `docs/OVERNIGHT_PLAN_2026-06-28.md`.

## ⚠️ DO FIRST
1. **Run `docs/CW_PREFLIGHT.md`.** The mounted repo corrupts (NUL injection + index/HEAD). Verify/repair,
   `git config maintenance.auto false`. **Never commit/push from the mount** — clean clone in `/tmp`, and
   the actual `git push` is **Edward-run on the laptop** (the Cowork sandbox has read-only git, no push creds).
2. **`git fetch` / fresh clone before trusting anything** — local `origin/*` refs go stale; the git proxy
   throws intermittent 502s/timeouts, so **retry clones**.

## Where things stand (main = `0064590`)
- **Live:** teal Sales Site landing at **www.caira.net.au** (marketing public, `/login` magic-link,
  `/dashboard` `@caira`-allowlisted). `AUTH_ALLOWLIST` set in prod.
- **Shipped to main:** Phase G hub backend + **G2 wire-up** (real `/hub` `/emar` `/incidents`
  `/incidents/rp` `/notifications` routes) + the 5 design screens (SSOT); hub/RP SQL **applied live**
  (RLS verified); **cc1 + cc2 + cc3** — security pass, RLS-CI-guard repair, Phase-H medication
  authorisation state machine + schema (`prisma/sql/medication.sql`, unapplied) — landed via `jymx5u`.
- **Specced / planned:** medication **visual verification** (`docs/MED_VERIFICATION_SPEC.md`); the
  **Caira/Rive** character system (`docs/design/CAIRA_ANIMATION_RECONCILIATION.md`; Edward authoring
  `public/caira/caira.riv` — see `docs/design/Caira Rive Authoring Walkthrough.md` in Drive); the
  **enterprise-readiness overnight plan** (`OVERNIGHT_PLAN_2026-06-28.md`, phased pilot-paid → enterprise).

## 🔴 Immediate pending
- **Merge PR #7** (`claude/graft-uzrp0b-hardening-9uhmuq`) — uzrp0b's unique hardening (sentry-scrub,
  security headers, upload cap, learned-options redaction, Sentry PII redaction) onto the jymx5u base.
  **cw already verified it's safe** (3-way merge preserves all jymx5u work + adds hardening; keeps
  participant-access gating). The branch is **8 behind main so GitHub's diff looks like deletions — it
  isn't.** Merge via a normal **merge commit**, run `lint`/`build` or let Vercel gate. Then retire
  `claude/start-prompt-cc-{vpar7g,uzrp0b,jymx5u}` + the graft branch.

## Your standing job during the overnight run
cc and cd run their queues in `OVERNIGHT_PLAN_2026-06-28.md` (cc next = **cc4**; cd next = **cd1**) on
their own branches. For each push: clean-clone, sanity-check the gate claims + that the merge into `main`
is clean/additive, then **prepare** a verified merge. Because cw can't push, record ready merges + any
`[!]` under the plan's **Blockers & morning hand-off** for Edward to land. Keep `COMMAND_CENTRE.md`'s
decision log + the plan's checkboxes current; **re-fetch `COMMAND_CENTRE.md` immediately before any doc
edit** (concurrent sessions clobber it).

## Hard-won gotchas (read before merging anything)
- **Harness binds sessions to ad-hoc `claude/start-prompt-*` branches**, NOT the plan's
  `claude/cc-enterprise`/`cd-enterprise` → expect parallel, divergent work on the *same* queue item.
  Reconcile by **superset**: pick the most-complete branch as base, graft only what's genuinely unique,
  and keep the *correct* implementation where they overlap (e.g. hub gating = participant-access, not org-scope).
- **Verify the MERGE RESULT, not the branch-vs-main diff.** A branch cut before recent work looks like it
  deletes that work; the 3-way merge actually keeps it. Always check the merged tree for the key files.
- cc/cd (Claude Code) push their own branches; **cw prepares laptop pushes only.**
- **DEV_AUTH can't run on Vercel** (hard `NODE_ENV` gate) — local-only; don't plan hosted act-as-anyone on it.

## ⛔ Edward-gated (never autonomous) — current open list
Merge PR #7 · provision **Upstash** (`UPSTASH_*`; rate-limit/spend-cap/PIN-guard fail-open without it) ·
audio/OCR **DPA / on-device** before real data · confirm Supabase **buckets are private** · run
`verify_rls.sql` on the live DB · **rotate the exposed DB password** · author **`caira.riv`** · enable
**MFA** in Supabase (+ cd designs enrol/challenge) · provision GEMINI/VAPID/Stripe/Resend keys · engage
the **NDIS lawyer + BSP** (gates all real data; RP + medication authorisation). **Dummy data only** until cleared.
