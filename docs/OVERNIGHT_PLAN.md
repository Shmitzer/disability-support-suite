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
- [x] **3. Wire `CairaAdmin` in as an `/admin` route** (mock data). _No `CairaAdmin.jsx`
      existed anywhere in the repo or git history, so — per the no-standalone-jsx
      convention — built `src/app/admin/page.tsx` as a `CairaAdmin` TSX server component
      from the design SSOT ("Web A · Coordinator dashboard"), in Sage & Clay, all mock
      data. Placed outside the `(protected)` phone chrome for the full desktop canvas;
      still auth-gated by `middleware.ts`. Builds as a static `/admin` route._
- [x] **4. #7 LearnedOption** — per-org custom + global seeds + de-identified
      analytics. Schema change → `.sql` file only, do NOT apply.
      _Code (`src/lib/learned-options.ts`): `getApprovedOptions`/`recordCustomOption`
      now take an optional `organisationId` and scope to **global seeds (org=null) +
      this org's own rows**; new typed options are stamped with the worker's org so
      they stay private to that tenant; solo workers keep seed-only behaviour. Threaded
      org through `log-actions.ts` (`buildDetail`) and the `/shift/[id]` page.
      **De-identified analytics:** `reportOptionEvent()` fires `learned_option_suggested`
      / `learned_option_promoted` to PostHog with a constant distinctId and only
      `{kind, name, useCount}` — no org/user/participant data. Schema change written to
      `prisma/sql/learned_options_per_org.sql` (per-org unique via `COALESCE`, read
      index, LearnedOption-specific RLS so globals are world-readable) — **NOT applied**.
      Code degrades gracefully under the current global-unique schema (create race is
      caught)._
- [x] **5. Enterprise privacy draft** → `/privacy` (marked draft). _No separate draft
      doc existed, so authored a 13-section enterprise-grade privacy policy in
      `src/app/(public)/privacy/page.tsx`: processor/controller roles, collection, AI
      de-identification, sub-processors, AU data residency / cross-border, security,
      retention & deletion, data-subject rights + right-to-erasure, OAIC Notifiable Data
      Breaches, children/vulnerable persons. Clearly marked **Draft — not in effect**
      (banner + title + metadata), styled in Sage & Clay. Placeholders (entity, contact,
      retention periods, sub-processor list) flagged for legal review._
- [ ] **6. Extend `recordAudit()`** to roster / report actions.

## Notes & blockers

_(appended as work proceeds)_
