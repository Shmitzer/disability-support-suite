# Caira — session resume (2026-06-26, post soft-launch + domain)

Point a fresh **Cowork** or **Claude Code** session at this to resume fully oriented. Supersedes
`MORNING_START_PROMPT.md` for anything dated after it. **Verify, don't trust** — confirm live state
before acting.

---

## Who / what
**Caira** — NDIS disability-support SaaS (Australia). Repo: `Shmitzer/disability-support-suite`
(public). Next.js 16 (App Router), TypeScript, Tailwind, Prisma, Supabase (Postgres + Auth + RLS),
Gemini AI. Brand: **"Sage & Clay"** — teal primary `#0f766e`, clay accent `#df5b40`, warm-paper
neutrals; Bricolage Grotesque (display) + Figtree (body). Wordmark = the **"Mark-i"** (the dot of the
**i** is a small clay heart). Build roles: **cc** (Claude Code — logic/backend/wiring in `src/`) ·
**cd** (design — `docs/design/` is the SSOT) · **Cowork** (browser/dashboard ops, file work).

Live URLs: **`https://caira.net.au`** (canonical, live) · `disability-support-suite.vercel.app`
(still valid fallback). Soft launch is **dummy data only** behind an email allowlist.

---

## ⭐ NEW DIRECTION — Caira character AI helper across all UI (cd in progress)

**cd is updating ALL UI to embed the Caira character — a clay-molded AI helper / companion that is
"the face of the product," lives in the nav, and reacts to actions.** This is **Step 1 of the bigger
vision (the Caira character system)**, now actively being built into the interface rather than left
as a future item.

- **Actual character + animation design lives in the "Master Handover" on Google Drive** — that is the
  source of truth for the character's look, expressions, idle/reactive states, and animations. It is
  **NOT in this repo.** Pull it from Drive before building character visuals.
- Repo only contains the *groundwork*: the "Sage & Clay" language, the clay accent + "Pebble" soft-clay
  icon style, the **Mark-i** wordmark/logo explorations (`docs/design/Caira Logo *.dc.html`,
  `Caira Icon Personalities.dc.html`, `Caira Directions.dc.html`), and written references to a
  **"Character-System overlay UI"** (`docs/CAIRA_AI_RECONCILIATION.md`) and **"Caira character
  unlocks"** as System-A game rewards (`docs/GAME_SUITE_100.md`).
- **Convention holds:** cd designs the character integration in `docs/design/` **first** (`.dc.html`
  + screenshots in `docs/design/screenshots/` + a `HANDOFF.md` note), then **cc** rebuilds the React
  UI in `src/` to match. Don't let design and `src/` drift.
- **Guardrail:** two reward systems stay strictly separate (NDIS-goal vs social/play, no shared data
  flow); social + multiplayer features stay **flag-off** until legal review.

**Next-session first moves on the character work:**
- **cd:** pull the Master Handover from Drive → design the character's placement + reactive states for
  each core surface (nav/home, shift capture, voice/AI flows, console, portal) as `.dc.html` + screenshots.
- **cc:** once a screen's `.dc.html` is committed, build the character component in `src/` (pure
  SVG/CSS/React, no new deps, no legal gate) and wire its reactive states to real actions.

---

## State at end of THIS session (2026-06-26)

### Soft launch — LIVE (done this session, via Cowork on the live dashboards)
- **Vercel build green** on `main`; production redeployed twice for env changes.
- **`DEV_AUTH` removed** from Vercel Production (was set; now gone — confirmed prod shows the public
  marketing page, not an auto-signed-in dev identity).
- **`AUTH_ALLOWLIST` set** = `edward.neppl@gmail.com,cassandra.burgess727@gmail.com`. (Code reads it
  case-insensitive, comma-separated; `src/lib/allowlist.ts`. The var is now **non-sensitive** in Vercel
  — fine for an email list, easier to verify/edit. SUPERADMIN does **not** bypass the allowlist —
  the gate is email-only and runs before role resolution in `src/lib/session.ts`.)
- **Supabase access-token hook** (`public.custom_access_token_hook`) — verified **enabled**.
- **Supabase Auth URLs** — Site URL = `https://caira.net.au`; redirect allow-list =
  `https://caira.net.au/**`, `https://disability-support-suite.vercel.app/**`, `http://localhost:3000/**`.
- **Smoke tests passed:** signed-out → marketing; `/auth/denied` renders; DEV_AUTH confirmed off.
  **Edward signed in successfully** (magic link, dummy data). Built-in Supabase email is fine for the
  current 1–2 users; **Resend SMTP still unset** for higher volume.
- **Testers:** Edward + Cassandra on the allowlist. Add more later: append `,email` to `AUTH_ALLOWLIST`
  and redeploy.

### Domain — WIRED + LIVE (done this session)
- Vercel: **`caira.net.au`** (apex, Production, canonical) + **`www.caira.net.au`** (307 → apex). Both
  **Valid Configuration with SSL**.
- Registrar = **Crazy Domains**. DNS: **A `@` → 216.198.79.1** and **A `www` → 216.198.79.1** (both
  repointed from the old parking IP `27.124.125.171`). The **`litesrv._domainkey` CNAME → mlsend.com**
  (MailerLite DKIM, for the waitlist) was left untouched.
- Minor polish for later: `www` redirect is **307 (temporary)** — switch to **308 (permanent)** for SEO
  if desired.

### Repo / git
- **`origin/main` = `44697d7`** ("ccu: record Caira email/domain decision"). Since the prior resume,
  `main` gained ~35 commits today: the **game suite FINAL** (100-game wave partition 11+27+37+22+3,
  Wave 0/1 specs, expert review, AI reconciliation), a **marketing content engine**
  (`marketing/content-engine/` — `sales.html` landing page with a live **MailerLite waitlist**, 12 weeks
  of content, nurture/broadcast emails, SEO pages, lead-magnet PDFs, a content-gen CLI with an NDIS
  compliance gate), and **strategy/founder docs** (strategic review v2, founder transition + comp,
  co-founder guide, launch-readiness checklist).
- **Laptop is behind + has a corrupted git index** (carried over). Local `main` = `54fb28b`, HEAD =
  `claude/phase-e-auth @ d493ca0`. To sync, in the **native** terminal at the repo root:
  ```
  del .git\index
  git checkout main
  git pull origin main
  del .git\objects\info\commit-graph        (clears the cosmetic "improper chunk offset" error)
  git status
  ```
  (The sandbox/Cowork mount cannot rebuild the git index reliably — do git ops natively.)
- **Uncommitted on laptop (from the original morning prompt, still pending):** the `SUPERADMIN` wiring
  in `src/lib/rbac.ts`. Commit it after the index is rebuilt.

---

## Edward's outstanding actions (agent-gated — don't attempt autonomously)
- **Book the NDIS lawyer** — still the **critical path** (privacy / provider ToS / DPA / dual-role
  consent; gates any *real* participant data, wanted in weeks).
- **Laptop git:** rebuild the index + `git pull origin main` + commit the pending `rbac.ts`.
- **Rotate the exposed DB password** (then update `DATABASE_URL`/`DIRECT_URL` everywhere).
- **Resend SMTP** + verify `caira.net.au` in Resend — needed before inviting more than a couple testers.
- **Run the SQL apply scripts** (READINESS §B / the ~13 unapplied feature tables) by hand in the
  Supabase SQL editor; re-run the RLS verify after.
- **Keys when each feature goes live:** VAPID (web-push), Stripe (prices + webhook), PostHog, Sentry,
  Upstash (rate-limit), embeddings provider.
- **Pull the Master Handover** (Drive) into the character-system design work.

---

## Guardrails (never break)
- The **12 architectural rules** in `COMMAND_CENTRE.md` (AI only via `src/lib/ai.ts`; PII scrub before
  any external API; relative storage paths; `sectorConfig` labels — no hardcoded sector terms;
  `organisationId` nullable; no SQLite in prod; real auth; local-state backup on submit; audit every
  sensitive action; `userId`+`organisationId?` on new tables; validate LLM output; idempotency keys).
- **Design-SSOT:** cd designs in `docs/design/` first; cc builds `src/` to match. No standalone
  render-outside-the-app components.
- **Dummy data only** until the legal gate clears. **Social/multiplayer stay flag-off** until legal review.
- **ccu convention:** `docs/COMMAND_CENTRE.md` updates always commit/push to `main`, even during a
  feature-branch session.

---

## Key docs (read in this order)
`SESSION_RESUME_2026-06-26.md` (this) → `COMMAND_CENTRE.md` (canonical build status) →
`DECISIONS.md` → `READINESS.md` → `CAIRA_AI_RECONCILIATION.md` (character/AI overlay + one-brain plan)
→ `GAME_SUITE_100.md` → `docs/design/HANDOFF.md` + `docs/design/` (Sage & Clay, Mark-i, directions) →
**Master Handover (Google Drive)** for the character + animation design.
