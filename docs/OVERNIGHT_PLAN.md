# Caira — Overnight Build Plan

Autonomous build session. Tasks done in order, committing after each, keeping
`tsc` / `lint` / `build` / `npm test` green throughout.

**Hard rules:** never run `db push` / `--force-reset` on the live DB; never touch or
enter credentials (skip anything needing new keys); schema changes go to a `.sql`
file and are **not** applied; if blocked, note the blocker here and move on.

**Baseline (start of session):** `tsc` ✓ · `lint` ✓ · `npm test` 34/34 ✓ · `build` ✓
(headless — Prisma client generated; schema-engine fetched manually via proxy).

## Tasks

- [x] **1. Rebrand to Caira** — `APP_NAME` constant + Bricolage Grotesque / Figtree
      fonts + Sage & Clay design tokens. _Already in place from prior commits
      (`6cf297a`, `53c028f`): `APP_NAME = "Caira"` in `src/lib/brand.ts`, fonts loaded
      in `layout.tsx`, Sage & Clay tokens in `globals.css`. Verified the only remaining
      "DSW" strings are the **job role** (Disability Support Worker), the note glossary,
      and internal cookie/localStorage keys — domain vocabulary, not branding._
- [x] **2. Phone capture prototype** — chip grid → detail/type → finish → AI note,
      Sage & Clay, wired to existing actions, reachable via the Cloudflare tunnel.
      _Built at `/shift/[id]` (`ShiftTracker.tsx`, commits `1baafc3`/`53c028f`):
      Capture tile grid → per-category detail panel (`DetailFields`) + Mic/type free-text
      → FINISH SHIFT (`clockOff`) → AI note (`ReportPanel`). All wired to existing server
      actions (`addLogEntry`, `clockOff`, generate-note). `next.config.ts` allowlists
      `*.trycloudflare.com` for dev origins + Server Actions; `npm run dev:phone` opens the
      tunnel. **Note:** cloudflared can't run inside the cloud sandbox (outbound port
      blocked) — it's a local laptop workflow, as documented in `scripts/phone-tunnel.mjs`._
- [ ] **3. Wire `CairaAdmin` in as an `/admin` route** (mock data).
- [ ] **4. #7 LearnedOption** — per-org custom + global seeds + de-identified
      analytics. Schema change → `.sql` file only, do NOT apply.
- [ ] **5. Enterprise privacy draft** → `/privacy` (marked draft).
- [ ] **6. Extend `recordAudit()`** to roster / report actions.

## Notes & blockers

_(appended as work proceeds)_
