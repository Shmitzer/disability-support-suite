# Caira — morning start prompt (new Cowork + Claude Code session)

Paste/point a fresh session at this to resume fully oriented. Written 26 Jun 2026 ~03:20 AEST,
at the end of a large build + planning + strategy session. **Assume the overnight build ran —
verify, don't trust.**

---

## Who / what
**Caira** — NDIS disability-support SaaS (Australia). Repo: `Shmitzer/disability-support-suite`
(now public). Next.js 16 (App Router), TypeScript, Tailwind, Prisma, Supabase (Postgres + Auth +
RLS), Gemini AI. Brand: **"Sage & Clay."** Caira is also a **clay-molded character** = the face of
the product (nav bar, reacts to actions) — see the Master Handover. Build roles: **cc** (Claude
Code — logic/backend/wiring) · **cd** (design — `docs/design/` is the SSOT).

## State at end of last session
- **PR #3** (52-commit feature collation) merged to `main`; command-centre conflict resolved. **PR #4** (RLS v2) left open, held for decisions.
- **cd's finalized design landed** in `docs/design/`: Mark-i wordmark, logo component, sales site, Feature Showcase, "Sage & Clay" design-system tokens. HANDOFF.md + README.md updated.
- **14 scope decisions locked** → `docs/DECISIONS.md`. Full readiness map → `docs/READINESS.md`.
- **`SUPERADMIN`** override wired into the legacy gates (`src/lib/rbac.ts`) — **uncommitted**.
- **Soft-launch ops:** Vercel build green (`e9ffe44`); Supabase Auth Site URL fixed (was bouncing to localhost); JWT claims hook **enabled**. Hit the built-in email rate limit → needs Resend SMTP.
- **Overnight autonomous build** queued → `docs/OVERNIGHT_BUILD.md` (resumable, ledger-driven).
- New strategy docs written: `docs/STRATEGIC_REVIEW.md` (tech + legal audit + exit model), `docs/GAME_SUITE_100.md` (100-game suite).

## FIRST 10 minutes — verify overnight results
1. `git log --oneline -40` + read the **Progress ledger** in `docs/OVERNIGHT_BUILD.md` → see which C/D tasks actually completed.
2. Confirm green: `tsc` · `lint` · `npm test` · `npm run build`. Re-run/fix anything red before new work.
3. If the local git index is corrupted (`fatal: unknown index entry format`): `del .git\index` → `git reset` (working files are safe), then commit the pending `rbac.ts` + docs.

## Edward's outstanding actions (agent-gated — don't attempt autonomously)
`AUTH_ALLOWLIST` (5 tester emails) · remove `DEV_AUTH` from Vercel · Resend SMTP + verify
`caira.net.au` in Resend · **rotate the exposed DB password** · run the SQL apply script
(READINESS §B) · wire `caira.net.au` DNS · **book the NDIS lawyer** — this is the critical path
(real users wanted in *weeks*; brief already written: "NDIS Lawyer Briefing & Exit Readiness").

## The bigger vision now on the table (Master Handover — Caira character + game suite)
Seven steps beyond the worker app: (1) Caira character system, (2) state audio, (3) role-based AI
brain, (4) web-access permissions, (5) participant goals + gamification + 5 therapeutic games,
(6) safe social connections [flag OFF], (7) multiplayer game suite [flag OFF, skeleton only].
**Two reward systems kept strictly separate** (NDIS-goal vs social/play — no shared data flow).
Social + multiplayer are **gated behind feature flags + legal review** (safeguarding). Full
catalogue in `docs/GAME_SUITE_100.md`; risk/feasibility in `docs/STRATEGIC_REVIEW.md`.

**⚠ Before building Step 3 (AI Brain):** there are TWO independently-designed Caira AI helpers —
the existing repo assistant (`assistant-*.ts`, retrieval-grounded, through the `ai.ts` seam) and
the Drive "AI Brain" handover (role personas, calls Gemini directly, adds `CairaFlag`). They must
be merged into one brain. Build Step 3 against **`docs/CAIRA_AI_RECONCILIATION.md`**, not the
handover in isolation.

## Recommended first moves this morning
- **cc:** land + commit overnight work (green); produce the ordered SQL apply script; if the app
  build queue is clear, start **Step 1 (Caira character system)** — it's the foundation everything
  else hangs off and is pure SVG/CSS/React (no new deps, no legal gate).
- **cd:** continue critical-path UI (incident register, notifications), lock sales-site Direction B.
- **Edward:** book the lawyer; do the laptop ops (SQL apply + DB-password rotation).

## Key docs (read these, in order of usefulness)
`DECISIONS.md` → `OVERNIGHT_BUILD.md` → `READINESS.md` → `STRATEGIC_REVIEW.md` →
`GAME_SUITE_100.md` → `COMMAND_CENTRE.md` → Master Handover (Drive).

## Guardrails
The 12 architectural rules (COMMAND_CENTRE.md) · design-SSOT convention · **dummy data only**
until the legal gate clears · social/multiplayer stay flag-off until legal review.
