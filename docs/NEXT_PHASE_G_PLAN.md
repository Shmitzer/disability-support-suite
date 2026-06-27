# Phase G — Trial-Ready (NLS soft-trial on dummy data)

**Written 2026-06-27 (Cowork).** Canonical build status lives in `docs/COMMAND_CENTRE.md` on
`main`. This is the plan for the next phase + the two role start-prompts
(`START_PROMPT_CC.md`, `START_PROMPT_CD.md`).

---

## The goal

Move from *"feature-rich worker app + enterprise foundation"* to *"a coordinator and a worker can
run the NLS trial end-to-end on dummy data."* Two things have to happen: **consolidate** the
backend work that's built but stranded on un-merged branches, and **close the design gaps** so the
shipped-but-undesigned surfaces become real screens. Hard rule unchanged: **no real participant
data until the legal gate clears** — Phase G is built and demoed entirely on dummy data.

## Where we are (verified on `main`, 2026-06-27)

- Phases **A–F** complete; **RLS applied live + cross-tenant verified**.
- Worker capture loop, voice + live transcription, participant care-profiles, note→entry
  extraction, AI clarifying prompts — done.
- Enterprise foundation: capability-based RBAC, participant-scoped access grants, tamper-evident
  (hash-chained) AuditLog, SUPERADMIN override — done.
- **Caira character + AI brain + audio + Rive scaffold — merged today** (`d10d2e9`).
- **Sage & Clay design-system SSOT — landed on `main` today** (`ba7fad5` / `3b0ebf0`).

## Built but UNMERGED — consolidate first

Three cc branches carry verified work that never reached `main` (each was handed to Cowork for the
laptop merge, same as Caira was):

| Branch | Carries | Closes |
|---|---|---|
| `claude/serene-feynman-p80kpr` | Phase 0 hardening: ordered SQL apply + RLS sweep, hard LLM spend cap, CI tenant-scope guard, SUPERADMIN | the "safe to take money + real data" layer |
| `claude/pensive-allen-md8h6h` | Phase 1.6: participant **right-to-erasure** (`anonymiseUser`) + full **NDIS plan fields** | the last open pre-real-user gate item |
| `claude/elegant-davinci-551vkd` | Phase 2 cores: NDIA price-guide importer, offline-sync core, SCHADS award engine | budgets/claims + offline + payroll groundwork |

⚠️ All three touch `rbac.ts` / `schema_baseline.sql` / `prisma/sql/`, so they must be merged
**carefully and in order**, re-verifying green after each (don't fast-forward all at once).

## Three workstreams

**G0 — Consolidation (cc, first).** Merge the three branches into `main` using the verified-merge
process (fresh clone → `prisma generate` → `tsc`/`lint`/`test`/`build` green → merge → push),
resolving the rbac/schema overlaps. Produce **one ordered SQL apply script** for everything still
unapplied (Caira's 3 files + Phase 0 sweep + 1.6 erasure/NDIS + 2.4 price guide). Output: a single
green `main` and one `psql`-ready script for Edward.

**G1 — Design-gated UI (cd).** Author the missing product surfaces from the SSOT, in
critical-path order for the trial: **incident register + reportable-incident form → notification
center + push-permission prompt → eMAR-lite → `/console` coordinator desktop → system/state pages
(404 / 500 / offline) → Modules + Pricing marketing**. `/portal` (participant + family/guardian)
stays **legal-gated** — skeleton only.

**G2 — Wire-up (cc, after each cd `.dc.html` lands).** Build each designed screen as a real route
in `src/` (App Router, TSX, Sage & Clay tokens), wired to the live backend. cc wires a screen only
after cd has committed its design — never the reverse (design-SSOT convention).

## Sequencing

```
G0 consolidation (cc) ───────────────┐
                                      ├──► G2 wire-up (cc, per screen)
G1 incident+notif (cd) ──► /console ──┘
Edward-gated ops (parallel): lawyer · SQL apply · DB-password rotation · Resend · deploy · caira.riv
```

cc and cd run in parallel; the only ordering rule is **cc wires a screen after cd commits it.**

## Edward-gated — the critical path (do not attempt autonomously)

1. **Book the NDIS specialist lawyer** — still the single thing the entire real-data path waits
   behind (brief already written). Real users are weeks away on your own timeline.
2. **Apply the consolidated SQL** by hand (`psql "$DIRECT_URL" -f …`, NOT `db push`), then
   re-run `verify_rls_editor.sql`.
3. **Rotate the exposed DB password** + provision Upstash / Resend / (Stripe later).
4. **Resolve the domain/allowlist mismatch** (`caira.app` vs `caira.net.au`) — one-line `.env`/test fix.
5. **Author `public/caira/caira.riv`** in the Rive editor (creature per-state expressions).
6. **Deploy** to Vercel + invite testers (dummy-data warning).

## Guardrails (unchanged)

The 12 architectural rules (`COMMAND_CENTRE.md`) · design-SSOT convention (design in
`docs/design/` first, then `src/` matches) · **dummy data only** until legal clears ·
social/multiplayer/games stay flag-off + after-revenue · `COMMAND_CENTRE.md` ccu always
committed to `main`, re-fetching immediately before push (concurrent sessions clobber it).
