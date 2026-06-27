# DSW App — Build Command Centre

**Single source of truth for build status.** Maintained by Claude Code in the repo
(version-controlled, updated every session). The *strategic* command centre (vision /
MRR / calendar) stays on Google Drive; this is the technical half.

- **Repo:** github.com/Shmitzer/disability-support-suite (note: *Shmitzer*, no first "c")
- **Working branch:** `claude/funny-brown-oinkli` (Caira character system + AI brain + audio + Rive) · prior: `claude/nifty-ritchie-nqmsxh`
- **Last updated:** 2026-06-27 (**cc handover — G2 wire-up (5 screens) + Caira animation track** — top section below) · prior: Phase G hub backend slice · **cc 2026-06-27:** the 5 G2 design screens wired into real App-Router routes (`/hub`, `/incidents`, `/incidents/rp`, `/notifications`, `/emar`) + Caira animation reconciliation draft + interactive marketing site-guide prototype — all merged to `main` (`d5c23b9`); ⚠️ gates not runnable in sandbox — run `tsc/lint/test/build` post-`prisma generate`. **cw 2026-06-27:** live `AUTH_ALLOWLIST` set (domains only) + redeployed; hub backend slice merged to `main` (`b955b8c`); **site LIVE on caira.net.au**; G2 design screens landed (`1b82a12`); **Medication Verification + Authorisation** spec captured (`docs/MED_VERIFICATION_SPEC.md`) — see decision log

---

## 🤝 HANDOVER TO COWORK — G2 wire-up + Caira animation track (cc, 2026-06-27)

Session built on `claude/keen-gauss-gfpe99` — **already merged to `main`**
(`d5c23b9`). Three deliverables; dummy data only throughout.

### Delivered (on `main`)
1. **G2 wire-up — the 5 committed design screens are now real App-Router routes**
   under `src/app/(protected)/`, wired to the live hub/incident/medication/notification
   backends already on `main`. Each = server component (data fetch) + `"use client"`:
   - `/hub` — Participant Hub (tablet): tap-to-identify → PIN sheet → capacity pick →
     "Logging as…"; quick-log tiles → `logHubEntry`; cross-org consent-gated timeline;
     Lock clears the actor. PIN entered at check-in is held in session memory and
     re-attested on each entry (cleared on Lock).
   - `/incidents` — register + reportable form (phone); "Restrictive practice"
     deep-links `/incidents/rp`. UI→backend type/severity mapping.
   - `/incidents/rp` — RP capture (tablet): quick-tap | dictate → review-before-save →
     `reportIncident` with RP fields per the HANDOFF column map; unauthorised use
     auto-flags reportable + Commission banner. Calm clay, never red.
   - `/notifications` — feed (New/Earlier) + two-step push-permission priming sheet.
   - `/emar` — eMAR-lite (phone): due/later/PRN/done; chemical-restraint PRN
     cross-references the RP flow.
   - Adds `--amber` + warm-neutral tokens to `globals.css` (HANDOFF reconciliation).
2. **Caira animation reconciliation** — `docs/design/CAIRA_ANIMATION_RECONCILIATION.md`
   (DRAFT): reconciles the new "Caira animation overhaul" blueprint (sprite-sheet +
   GSAP wander) against the already-scaffolded **Rive** approach. **Recommendation:
   keep Rive as the renderer; adopt the overhaul's behaviour/movement layer as a
   `CairaWanderController` wrapping the existing `CairaCharacter`** (two orthogonal
   axes — positional × expressive). 4 open questions; chief one = is the Rive-authoring
   resource committed?
3. **Interactive marketing site-guide prototype** — `docs/design/Caira Site Guide.dc.html`
   (DRAFT, design-prototype only per Edward): a large Caira "host" waits on the left
   (idle waves/jumps + soft synth blips), click → introduces herself + offers a
   walk-through, Yes → wanders the page stopping at each section with a responding
   pop-up box (Next/Skip). **No voice — noises only**; honours reduced-motion. Character
   is the static `caira-master` cutout stand-in; the tour logic IS the renderer-agnostic
   `CairaWanderController` → swaps to `<CairaCharacter>` (Rive) with no behaviour change.

### ⚠️ NOT verified here (sandbox limitation — please run on a real toolchain)
`node_modules` + the generated Prisma client are network-gated in the web session, so
**`tsc` / `lint` / `npm test` / `npm run build` could not run.** Cross-repo wiring for
the 5 screens is verified by inspection only (action imports + enum mappings all match
the backends). **Run the full gate set after `prisma generate`** before relying on the
routes. No SQL/schema changes — reuses backends already on `main`. PR #6 was the review
vehicle (now merged via `d5c23b9`).

### NEXT
- **(cw/Edward)** run `tsc/lint/test/build` post-`prisma generate`; visual-pass the 5
  routes vs the `.dc.html` screenshots (Hub uses an initials-disc Avatar stand-in; some
  design-only CSS vars mapped to existing tokens).
- **(Edward — gated)** answer the Rive-authoring question (unblocks the animation path);
  decide whether to author `caira.riv` or fall back to sprite-sheets.
- **(cc/cd)** Edward is **revamping the sales site** — leave `Caira Site Guide.dc.html`
  as the prototype; lift `.kyra`/`.kyra-bubble` + the `TOUR` script into the new site
  later (point each `data-tour` stop at the real sections).
- **(Edward — gated, unchanged)** apply `prisma/sql/hub.sql` + `restrictive_practice.sql`
  by hand if not already live; the routes degrade gracefully until then.

---

## 🤝 PHASE G — Participant Hub backend slice (cc, 2026-06-27)

The cc hub backend per `docs/HUB_DATA_MODEL.md` is **built + pushed** on
`claude/pensive-hamilton-hj1cpu` (commit `ad8239c`). Additive throughout — the
per-worker `Shift` model (billing/EVV/SCHADS) is untouched. **No design dependency**
(this is the backend half; cd's `.dc.html` screens wire on top later). Gates all green:
`tsc` ✓ · `lint` ✓ · `npm test` **183** ✓ · `npm run build` ✓. Dummy data only.

**Delivered:**
- **Schema** — `HubDevice` / `HubSession` / `HubCheckIn` (each with org `tenant_isolation`
  RLS); `LogEntry.shiftId` now **nullable** + 5 hub columns (`hubCheckInId`,
  `loggedByWorkerId`, `actingCapacity`, `participantId`, `sourceDevice`);
  `Worker.pinHash`/`pinSetAt`; `Incident` RP columns.
- **Unapplied SQL** — `prisma/sql/hub.sql` (tables + RLS + `LogEntry` ALTERs +
  back-compatible backfill) and `prisma/sql/restrictive_practice.sql` (Incident RP).
  Idempotent, editor-safe. ⛔ **NEVER `db push`** — Edward applies by hand.
- **`src/lib/hub.ts`** — pure core (unit-tested): capacity→funding routing,
  entry stamping, server-side scrypt PIN hash/verify, RP `reportable` derivation,
  participant-keyed Realtime channel.
- **`src/lib/hub-actions.ts`** — device trust, participant-anchored session lifecycle,
  N concurrent PIN-gated check-ins (3:1), idempotent attributed `logHubEntry`, and the
  consent-gated cross-org `participantHubTimeline` (`// tenant-ok:` annotated, paginated).
- **`src/lib/hub-realtime.ts`** — best-effort participant-keyed Supabase Realtime ping +
  client subscribe helper (DB stays source of truth; a Realtime failure never fails a write).
- **`incident-actions.ts`** — RP fields on `reportIncident`; unauthorised RP auto-reportable.
- **`test/hub.test.ts`** — capacity routing, stamping, RP derivation, PIN, timeline gate
  (cross-org read **denied without a grant**).

**NEXT (Edward — gated):** apply `prisma/sql/hub.sql` + `restrictive_practice.sql` by hand
(after `apply_phase_g`), then re-run the RLS cross-tenant check. **NEXT (cc):** G2 wire-up
of the hub + RP screens **after cd commits the `.dc.html`** (Participant Hub → RP incident →
incident register → notification center → eMAR-lite → `/console`).

---

## 🤝 PHASE G — G0 consolidation complete (cc, 2026-06-27)

The three stranded backend branches are **consolidated onto `claude/youthful-bardeen-8ppnpp`**
(pushed), verified green after each merge with a real toolchain (npm install + `prisma generate`
both work in this session — not network-gated this time). ⚠️ **`origin/main` is still stale at
`0d15bb37`** (it does NOT contain Caira/Sage-&-Clay/Phase-G — those + the 3 slices all live on
`youthful-bardeen`). Final merge to `main` is **Edward/Cowork-gated** (the handover convention),
same as every prior branch.

**Merged in order, re-verified green after each** (`tsc` ✓ · `lint` ✓ · `npm test` ✓ · `npm run build` ✓):
1. `claude/serene-feynman-p80kpr` — Phase 0 hardening (no conflicts). tests → 139.
2. `claude/pensive-allen-md8h6h` — Phase 1.6 erasure + NDIS fields (conflicts in `rbac.ts` +
   `rbac.test.ts`, both SUPERADMIN-override — resolved to the named `PLATFORM_ROLE` constant; kept
   both test bodies). tests → 145.
3. `claude/elegant-davinci-551vkd` — Phase 2 cores (only `COMMAND_CENTRE.md` conflicted — took ours).
   tests → 172.

**Final state of `youthful-bardeen`:** `tsc` ✓ · `lint` ✓ · `npm test` **173/173** ✓ · `npm run build` ✓.

**Also landed this slice:**
- **`prisma/sql/apply_phase_g.sql`** — the ONE ordered idempotent apply script for everything still
  unapplied (Phase 0 `apply_all_features.sql` → Caira `caira_ai`/`org_caira_enabled`/`caira_flag_rls`
  → 1.6 `participant_ndis_erasure` → 2.4 `ndis_price_guide`), `ON_ERROR_STOP`, with a dry-run note.
  **Validated against a throwaway Postgres 16:** clean fresh apply AND idempotent re-run; CairaFlag,
  NdisSupportItem, Participant NDIS+erasure columns, Organisation.cairaEnabled all land; RLS enabled
  on every new table (Document/base-table RLS comes from the already-live `rls_policies_v2.sql`).
- **AUTH_ALLOWLIST → both domains** (decision #2): `.env.example` + `test/allowlist.test.ts` now
  document/assert both `@caira.app` and `@caira.net.au` (parser was already data-driven; Edward sets
  the live env value).
- **eslint** scoped to app source (excludes `docs/design/` prototypes) so the baseline is green.

**NEXT (Edward — gated):** ① review + merge `youthful-bardeen` → `main`. ② `psql "$DIRECT_URL" -f
prisma/sql/apply_phase_g.sql` by hand (NOT `db push`), then re-run `verify_rls_editor.sql`. ③ set
the live `AUTH_ALLOWLIST`. **NEXT (cc):** G2 wire-up of each screen **after cd commits its `.dc.html`**
(incident register → notification center → eMAR-lite → `/console` → system/state pages).

---

## 🤝 HANDOVER TO COWORK — Caira character + AI brain + audio + Rive (2026-06-26)

All on branch **`claude/funny-brown-oinkli`** — **MERGED to `main`** (commit `899b35e`, 2026-06-27). Verified headless:
`tsc` ✓ · `lint` ✓ · `npm test` (25/25, incl. 4 new Caira suites) ✓ · `npm run build` ✓.
Asset master + every spec/handover doc are in the **"Caira UI"** Google Drive folder.

### Delivered (on `claude/funny-brown-oinkli`)
- **Character system** — `components/caira/`: nav `CairaBar` (wandering mark), `CairaAIOverlay`,
  `CairaRecordingOverlay`, `CairaEmpty/Loading/Error`, `caira.css` animations. Wired into the root
  layout behind a **provider**; org-wide enable/disable toggle (`Organisation.cairaEnabled`).
- **AI brain** — `app/api/caira/route.ts` (role personas: worker/participant/supervisor via
  `lib/caira/systemPrompts.ts`), `lib/ai.ts#cairaChat` (Gemini, no tools unless web granted),
  participant safety pre-check + `CairaFlag` + flag badge, `preference` + `flags` routes.
- **Web-access permissions** — per-user `cairaWebAccess` (admin/supervisor grant via
  `app/api/admin/caira-access`); **participant lockout enforced in 3 places** (Prisma default, the
  chat route, the grant route). Admin UI in `/admin/settings`.
- **Audio** — `lib/caira/audioManager.ts` (Web Audio, synth state sounds, no assets) + mute toggle.
- **Real-creature rebrand** — replaced the spec-drawn SVG with the actual clay creature. Retouched
  cutout master at **`public/caira/caira-master.png`**. New **5-state** model
  (greet/cheer/reassure/idle/goal), `CairaCharacter` renders **Rive** (`@rive-app/react-canvas`,
  two-way: pushes `state`/`quiet`, reads events) with the static cutout as fallback + reduced-motion
  + Quiet variant. Palette retired `#4db8b0` → canonical Sage & Clay (`--brand #0f766e`).
- Root layout hardened against DB outages (no longer 500s every route on a DB hiccup).
- **DB:** `prisma/sql/caira_ai.sql` + `org_caira_enabled.sql` (UNAPPLIED) + `schema_baseline.sql`
  updated; new `CairaFlag` model and `Worker` columns (`participantAILevel`, `cairaWebAccess*`).

### NEXT (Cowork / Edward — in order)
1. **Apply SQL by hand** (NOT `db push`): `prisma/sql/caira_ai.sql`, `prisma/sql/org_caira_enabled.sql`.
   Both readers tolerate the columns/table being absent, so the app runs before they're applied.
2. **Review + merge** `claude/funny-brown-oinkli` once `tsc/lint/build` pass on the laptop after
   `prisma generate`. Set `GEMINI_API_KEY` for Caira chat (degrades gracefully without it).
3. **Author `public/caira/caira.riv`** in the Rive editor from `caira-master.png` to the contract in
   the Drive docs *"Caira Rive — Rig & Integration Spec"* + *"…Per-State Animation Direction"*
   (state machine `Caira`; number `state` 0–4; bool `quiet`). **This is the only piece that gives
   per-state facial expression + posture** — until it lands, all states share one cutout (motion only).
   Drop the file in → animates with zero code changes (static fallback if absent).
4. **cd**: optional higher-res creature render for a crisper rig; design any net-new Caira surfaces.

---

## 🤝 HANDOVER TO COWORK — Phase 0 cc hardening complete (2026-06-26)

cc finished the **Phase 0 foundation-hardening** slice (no design dependency). Code is on
branch **`claude/serene-feynman-p80kpr`** (commit `78661b9`, pushed); detail in the Decision log.

### Delivered (branch `claude/serene-feynman-p80kpr`)
- **0.1 Ordered SQL apply + RLS sweep** — `prisma/sql/apply_all_features.sql` (one idempotent,
  `ON_ERROR_STOP`'d `\i`-include script: 13 unapplied feature files in dependency order,
  `audit_hash_chain`+`rbac_grants` first, RLS sweep last) + `prisma/sql/feature_tables_rls.sql`
  (enables RLS + per-table `tenant_isolation` on the feature tables that shipped DDL **without**
  it — incl. `Membership`/`ParticipantAccessGrant`/`Consent`/`ParticipantCareProfile`, whose RLS
  was only commented-out SQL). **Validated against a throwaway Postgres 16**: clean, idempotent,
  every swept table RLS-enabled.
- **0.2 SUPERADMIN wiring** — legacy `can(role,cap)` now honours SUPERADMIN as platform override.
- **0.3 Hard LLM spend cap + budget alarm** — `rate-limit.ts checkSpendCap()` wired into
  `/api/generate-note` + `/api/transcribe`; env-gated, fail-open, PostHog `llm_budget_alarm`.
- **0.4 CI tenant-scope guard** — `npm run check:tenant-scope` + CI step (unscoped tenant read = leak).
- **0.5** — verified all four integrations env-gated; PostHog behind `hasAnalyticsConsent()`.

### NEXT (Cowork / Edward — gated ops, in order)
1. **Apply the SQL (by hand, NOT `db push`):** from repo root, `psql "$DIRECT_URL" -f
   prisma/sql/apply_all_features.sql`, then re-run `prisma/sql/verify_rls_editor.sql` in the
   Supabase SQL editor (expect every public table RLS-enabled).
2. **Turn the spend cap on:** provision Upstash (`UPSTASH_REDIS_REST_URL/_TOKEN`) + set
   `LLM_DAILY_CAP`; without keys the throttle + cap are inert (dev behaviour unchanged).
3. **Rotate the DB password** + provision remaining keys (Stripe/Sentry/PostHog/Resend/VAPID,
   `shift-photos` bucket) per `SECRETS.md`.
4. **Enable MFA on the SUPERADMIN seat** (Supabase dashboard) — never the default login.
5. **CI** runs `prisma generate` so `tsc/lint/test/build` go green there (the web sandbox can't —
   Prisma engine CDN network-gated; cc verified tests/lint headless, residual failures are all
   missing-generated-client cascades).

### What's next for cc
Phase 1 screens are **design-gated** (cd must land `.dc.html` + screenshots first). Phase 2 is
after-first-revenue. The next cc-startable work is **Track L** (legal drafts: privacy/ToS/DPA/
consent + acceptance-logging to `ParticipantAccessGrant`/`Consent`) — parallel, no design gate.

### ⚠️ Multi-session note
Several cc sessions push ccu entries to `main` concurrently and have repeatedly overwritten this
Phase 0 entry from a stale copy. When editing `docs/COMMAND_CENTRE.md`, branch from the **latest**
`origin/main` and re-fetch right before pushing, or serialize ccu updates to one owner.

---

## 🤝 HANDOVER TO COWORK — Phase 2 logic cores (2026-06-26)

cc (Phase-2 lane) built every Phase 2 item that's cleanly startable **headless** — no design, no
`node_modules`, no first-revenue gate. **4 pure, unit-tested logic cores, 30/30 tests green** via
`tsx`. All on branch **`claude/elegant-davinci-551vkd`** (NOT merged to `main`); full detail in
**`docs/PHASE_2_HANDOFF.md`** + the decision-log entries below.

> Sandbox caveat: `node_modules` is network-gated in the web session, so `tsc/lint/build` couldn't
> run — cores verified with `tsx`. Server actions + the new Prisma model type-check/build on the
> laptop after `prisma generate`.

### Delivered (on `claude/elegant-davinci-551vkd`)
- **2.4 — NDIS price guide + claims.** `src/lib/price-guide.ts` (NDIA Support-Catalogue CSV importer,
  per-region price caps, over-cap validation) + `toNdisBulkCsv()` (real 16-col NDIA bulk template) in
  `billing-claims.ts`, wired into `billing-claims-actions.ts` (`importPriceGuide`, `checkClaimAgainstGuide`).
  New `NdisSupportItem` model + `prisma/sql/ndis_price_guide.sql` (UNAPPLIED).
- **2.2 — Offline sync core.** `src/lib/offline-sync.ts` — outbox with per-entity-serialised drain,
  retry/backoff, conflict reconcile (server duplicate = success), `pending/syncing/synced/failed` state.
- **2.5 — SCHADS award core.** `src/lib/schads.ts` — day penalties + overtime + shift loadings
  (higher-of) + casual loading + allowances, parameterised by a verify-before-use config.

### NEXT (Cowork / Edward — in order)
1. **Review + merge** `claude/elegant-davinci-551vkd` (or cherry-pick the 4 cores) once `tsc/lint/build`
   pass on the laptop after `prisma generate`.
2. **Apply SQL by hand** (NOT `db push`): `prisma/sql/ndis_price_guide.sql`, add `"NdisSupportItem"`
   to `schema_baseline.sql`, re-run `verify_rls.sql`.
3. **Supply/verify reference data:** confirm the NDIA price-guide file/version to import; verify/replace
   `DEFAULT_SCHADS_CONFIG` against the current Fair Work **MA000100** pay guide (defaults marked UNVERIFIED).
4. **2.2 service-worker half (laptop):** `@serwist/next` (app-shell precache + read caching + offline
   fallback ONLY — do NOT cache/replay server-action POSTs), web manifest, IndexedDB binding for the
   `offline-sync` outbox, + a route-handler replay mirror for Background Sync. Server idempotency is done.
5. **cd** designs the still-gated surfaces (`/portal` 2.1, messaging/handover 2.3, offline badges, the
   budgets/claims + price-guide-import screens) before cc wires them.
6. **Suggested next cc work** (no design/deps): **Track L** legal drafts.

---

## 🤝 HANDOVER TO COWORK — game review + sales page (2026-06-26)

Session worked on the **claude/awesome-mccarthy-ue78ce** branch; everything below is
**merged to `main`** (commit `2caf909`). Two deliverables + clear next actions.

### Delivered (on `main`)
1. **`docs/design/GAME_SUITE_REVIEW.md`** — three-lens (NDIS / game-design / engineering)
   appropriateness review of the 100-game catalogue, graded Must / Should / Consider, plus a
   **staged deployment shortlist** (§7). Recommended go-live = **Stage 0 + Stage 1 = 11 games**
   (smallest set that proves the engine *and* covers every NDIS goal category, zero
   safety/IP-gated titles). Top "Must" fixes: reframe `safe-crossing` to signal-recognition;
   age-band art decoupled from tier; IP pass on chess/go/KenKen/tangram; honest engine-cost on
   chess/go/circuit-logic; CI-enforce the a11y contract.
2. **`marketing/content-engine/landing/sales.html`** — standalone, no-build, Sage & Clay sales
   page generated from `landing/landing-copy.md`. Pre-launch (waitlist) variant,
   compliance-safe (no NDIS endorsement / guaranteed outcomes), WCAG-conscious. The MailerLite
   form is wired to the real `embed.html` field schema (`fields[email]`, `fields[name]`,
   `groups[]=Caira Early Access`, `fields[magnet]=both`).

### NEXT (Cowork / Edward — in order)
1. **Set the form action.** `sales.html` form `action` is still
   `REPLACE_WITH_YOUR_MAILERLITE_FORM_ACTION_URL`. Paste the MailerLite embedded-form POST URL
   (Forms → Embedded → "form action"), or paste MailerLite's own embed snippet over the
   `<form>` block.
2. **Deploy to get an *active* URL.** The file is in the repo but **not hosted** — no live
   link exists yet. Pick a host: drop into the caira.net.au host root, OR GitHub Pages, OR
   paste into a MailerLite Sites page (best while the domain isn't pointed). The intended live
   home is `https://caira.net.au`.
3. **At launch:** swap the three pre-launch CTAs ("Join the early list →") to the trial CTA
   ("Start logging notes free →"), and point `/privacy` at the live policy page (don't promote
   publicly until privacy policy is live — see LAUNCH_CHECKLIST).
4. **Game suite:** the review is advisory only — the catalogue/registry edits it recommends
   (`docs/GAME_SUITE_SINGLEPLAYER_100.md` + `src/lib/games/catalogue.ts`, both on
   `claude/nifty-ritchie-nqmsxh`) are NOT yet applied. Apply the "Must" items before any game
   ships to participants.

---

## 📣 MARKETING — Caira content engine seeded (2026-06-26)

Transparent, ToS-compliant marketing engine for Caira's pre-launch, founder-led
organic push. Lives at `marketing/content-engine/` — **merged to `main`**. A
copy-from set of these docs is also in Google Drive → **"Caira Marketing"**
folder (Email Nurture paste-pack, 12-week Posts, FB Page Setup, Launch Checklist).

**DONE (on branch `claude/festive-tesla-lebjxq`):**
- `docs/PLAYBOOK.md` — canonical strategy (warm-network-first, organic-first;
  channel priority Facebook → founder LinkedIn → IG → TikTok).
- `config.json` — positioning ("the shift logger built by a support worker"),
  audience, channels, + NDIS-advertising compliance ruleset.
- `src/` — `cli.js` (plan/draft/review/check/schedule), `generate.js` (drafts in
  voice; optional Claude API + voice pass), `meta.js` (official Graph API
  scheduling, own Page only), `compliance.js` (blocks "NDIS approved/endorsed",
  "guarantees compliance", etc.).
- `drafts/queue.json` — **48 founder-voice posts (12 weeks)**, all `needs_review`,
  all clear of compliance hard-fails.
- `lead-magnets/` — audit-ready note checklist + person-first cheat-sheet.
- `landing/landing-copy.md` — caira.net.au copy (pre-launch + launch variants).
- `email/nurture-sequence.md` — 5-email nurture (magnet → value → founder story
  → proof → soft CTA); `email/broadcast-ideas.md` — ongoing ~monthly broadcast bank.
- `content/seo/` — 3 GEO/SEO pages (best-ndis-shift-note-app, caira-vs-spreadsheets,
  how-to-write-ndis-progress-notes) for buyer-intent search + AI citation.
- `waitlist/` — `SETUP.md` (MailerLite: form → instant magnet → 5-email nurture)
  + `embed.html` (on-brand, accessible form). No custom code; ESP-hosted.

**Guardrails baked in:** own Page only, every post human-approved before schedule,
compliance-gated, app mentions disclosed. No fake personas / auto-engagement —
warm-network outreach + community + LinkedIn stay human (Edward's call on ban risk).

**LIVE BUILD STATE (2026-06-26 — handoff to Cowork mid-setup):**
- **MailerLite** account created ("Caira", 14-day trial → drops to free tier which keeps automations ≤1k subs).
- **Domain auth:** DKIM CNAME (`litesrv._domainkey` → `litesrv._domainkey.mlsend.com`) added at **Crazy Domains**, status pending/propagating — hit "Check records" later. ⚠️ Crazy Domains' DNS manager has **no TXT/SPF option** (only A/AAAA/CNAME/MX/CAA), so SPF/return-path TXT could NOT be added. DKIM alone usually verifies MailerLite. For full SPF + deliverability, **move DNS to Cloudflare (free)** later (recreate the 2 A records → 27.124.125.171, add SPF `v=spf1 a mx include:_spf.mlsend.com ?all`).
- **Groups** `Caira Waitlist` + `Caira Early Access` ✓. (Custom field `magnet` optional — skipped; Email 1 sends both PDFs to all.)
- **Embedded form** "Caira Waitlist" ✓ — branded sage, our copy, email + early-access checkbox (→ Early Access group) + reCAPTCHA + privacy line. NOT yet hosted/public.
- **Lead-magnet PDFs** uploaded to **Google Drive, set public** (both `anyone with link` verified): checklist `1iiH6fPVhUIluEO5oZHyN-Hpj_G9z8IrL`, cheat-sheet `1uRdTchJXTx66xfHIyiBKQrbRaG8T9WLx`.
- **Nurture automation** started: trigger = joins Caira Waitlist ✓; **Email 1 DONE** (subject/sender/preheader set, both PDFs linked, sender = edward.neppl@gmail.com for testing).

**NEXT (Cowork / Edward — in order):**
1. **Finish the nurture:** add Emails 2–5 with delays +2/+2/+3/+3 days. Copy from Drive "Caira – Email Nurture (paste-pack)" or `email/nurture-sequence.md`. Link the checklist PDF in Email 2's P.S.; link form/Page + both PDFs in Email 5.
2. **Verify domain** in MailerLite (Check records) — expect DKIM ✓. If MailerLite blocks sending without SPF, do the Cloudflare move.
3. **Switch sender** to `edward@caira.net.au` once verified (gmail-from won't deliver well), THEN **test the full automation** (PDFs land, unsubscribe works, mobile view).
4. **Host the form** — easiest now: a free MailerLite **Sites** landing page (caira.net.au not live). That URL → `config.json` `app.waitlistUrl` + Email 5 EARLY_LINK + FB Page button.
5. **Don't go public** (don't promote the form/Page) until **privacy policy live at caira.net.au/privacy** + legal go-to-market gate clears.
6. Then: create FB Page (Drive "Caira – Facebook Page Setup"); warm-network outreach; post weeks 1–2 (value only). Optional: FB Page ID + long-lived token for `schedule`.

Full step list: Drive "Caira – Launch Checklist" or `marketing/content-engine/LAUNCH_CHECKLIST.md`.

---

## 🎮 GAME SUITE — plan FINAL, building Wave 0 (2026-06-26)

> **▶ START HERE to build the games: [Issue #5 — Wave 0 (probe): single build
> checklist](https://github.com/Shmitzer/disability-support-suite/issues/5).**
> That issue is the one checklist to work against (engine-hardening P0s → foundation +
> Caira companion → 3 probe games → exit gate). Build on branch
> `claude/nifty-ritchie-nqmsxh` (engine code). Plan is **FINAL** and canonical on `main`:
> `docs/GAME_SUITE_SINGLEPLAYER_100.md` + `docs/CAIRA_AI_RECONCILIATION.md`. Companion
> design handoff is in Google Drive → **design** folder.

**Plan status (reviewed + finalised this session):** 100 games catalogued and partitioned into
build waves (**11 + 27 + 37 + 22 + 3 = 100**, verified — every game one wave, one of nine
build-by-template archetypes). All 11 Wave-1 games specced; remaining 89 archetype-mapped.
Three-lens dev-team review folded in (engineering / accessibility-clinical / product). **Wave 0
= Foundation + 3 games** (`touch-bloom`, `word-match`, `breathe-caira`), evidence-gated before
Wave 1; Waves 4–5 (ceiling) deferred. Bound to the Sage & Clay language + the Caira companion.

**Wave 0 first move (gated DB op, then code):** apply `prisma/sql/games.sql` → `games_rls.sql`
via the direct connection → `npx prisma generate`, then work Issue #5 top-down (the engine P0s
— tenant check into `recordSession`, `ParticipantXP` `(participantId, organisationId)` key,
idempotency key — come first, each with a test).

---

## 🎮 GAME SUITE — System A foundation built · handoff to Cowork (2026-06-26)

Step 5 (participant game suite) kicked off. Catalogue **re-scoped to 100 purely
single-player therapeutic games** spanning a 5-tier difficulty spine (T1 severe-ABI /
single-switch → T5 savant ceiling) so one suite serves the whole ability range.
Multiplayer (old System B) **deferred** — single-player only for now.

**DONE (on branch `claude/nifty-ritchie-nqmsxh`):**
- `docs/GAME_SUITE_SINGLEPLAYER_100.md` — full catalogue (100 games, tiered, NDIS-mapped,
  build-waved) + 5 deep-designed engine-proving games + build plan.
- **Prisma models** (`schema.prisma`): `NDISGoal`, `GoalProgress`, `GoalGameLink`,
  `GameSession`, `ParticipantXP` — tenant-stamped; the ONLY place therapeutic XP / goal
  progress lives (no social crossover).
- **Engine shell** (`src/lib/games/`): unified-input + accessibility-profile types, the
  canonical 100-game catalogue, a pure adaptive-difficulty/tier controller, and the
  session recorder (one txn → session + XP + linked-goal progress).
- `POST /api/games/session` to record a finished session.
- **16 unit tests** (`test/games-engine.test.ts`) — catalogue integrity + adaptive/XP
  logic — all passing (ran via locally-installed tsx; full `npm` blocked here, Prisma
  engine binary download is network-gated).
- **Migration SQL** (`prisma/sql/games.sql` + `games_rls.sql`) hand-applied style,
  matching repo convention. **Validated against a throwaway Postgres 16**: applies clean,
  idempotent, FK cascade + unique + the recordSession upsert all verified, RLS enabled.

**NEXT (Cowork / Edward — gated DB op):**
1. **Apply the migration** with the direct connection string (not done — no DB creds in
   the web sandbox): `psql "$DIRECT_URL" -f prisma/sql/games.sql` then
   `psql "$DIRECT_URL" -f prisma/sql/games_rls.sql` (both safe to re-run, in that order).
2. `npx prisma generate` (or next `npm run build`) so `session.ts` + the API route compile
   against the new models — **not type-checkable here** without the generated client.
3. Then build is clear for **Wave 1 game bodies** (`word-match` adaptive reference,
   `touch-bloom`, `pairs-pals`, `choose-ask`, `type-it`, …) + the `/games` launcher UI.

**Guardrail unchanged:** dummy data only until the legal gate clears — creating the empty
tables is fine; do not load real participant goals yet.

---

## 🚀 SOFT LAUNCH — live handoff to Cowork (2026-06-25 night)

Goal: **5 real testers logging in tonight on dummy data**, behind `AUTH_ALLOWLIST`. Hard
rule still holds: **no real participant data** until the privacy/legal gate clears.

**DONE (this session, on `main`):**
- PR #3 (logic build-out) + PR #4 (RLS v2 + design-kit rescue + soft-launch docs) merged to `main`.
- Supabase project stood up + all SQL applied **in order**: `schema_baseline` → `grant_api_roles`
  → `search_vector` → `auth_hook` → `rls_policies` → `rls_policies_v2`. (Schema was reset with
  `drop schema public cascade` first — one-shot baseline, not idempotent.)
- Dummy data seeded: **3 participants, 3 workers, 6 shifts, 15 events**
  (`npx tsx --env-file=.env prisma/seed.ts` — note `--env-file`; seed.ts does NOT load dotenv).
- **Build fix on `main` (`c3b6f1d`)**: `build` now runs `prisma generate && next build` — Vercel
  was failing on `Can't resolve '@/generated/prisma/client'` (client is gitignored).
- Domain **`caira.net.au` registered** (sole-trader ABN). `.com` + `.com.au` for "caira" are taken.

**IN FLIGHT / NEXT (Cowork to verify + finish):**
1. **Confirm the Vercel build went green** after `c3b6f1d` (redeploy if it cached the old commit).
2. **Vercel env vars (Production):** `DATABASE_URL` (pooler `:6543` `?pgbouncer=true`), `DIRECT_URL`
   (`:5432`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_ALLOWLIST` (5 tester emails). Do NOT set `DEV_AUTH`.
3. **Supabase dashboard toggle:** Authentication → Hooks → enable `public.custom_access_token_hook`
   (SQL created the fn; toggle activates it — logins lack the org claim without it).
4. **Supabase Auth → URL config:** Site URL = the Vercel URL (or `https://caira.net.au` once DNS
   is wired); add `…/auth/confirm` to redirect URLs. Built-in email is fine for 5 users.
5. **Smoke test:** signed out → marketing; allowlisted email → in, dummy data shows;
   non-allowlisted → `/auth/denied`. Optional `npm run verify:rls`.
6. **Invite the 5 testers** (URL + "dummy data only" warning).
7. Optional: point `caira.net.au` at Vercel (Domains → add → DNS records), then update Supabase URLs.

**Open notes for Cowork:**
- Laptop has an uncommitted local `package.json` change predating the build fix — `git stash` then
  `git pull` to avoid a conflict with `c3b6f1d`.
- Design gaps remain (Modules/Pricing/admin/auth routes undesigned; marketing `.dc.html` never
  existed — HANDOFF reconciled). cd owns that UI work.
- Full checklist: `docs/SOFT_LAUNCH_TONIGHT.md`; detail in `docs/SOFT_RELEASE.md`.

---

## Status snapshot

| | |
|---|---|
| **Branch / PR** | `claude/sharp-hypatia-6zdy2h` (Caira overnight build) |
| **Just finished** | **Caira overnight build** — rebrand verified; phone capture verified; new `/admin` coordinator dashboard (mock); LearnedOption per-org + de-identified analytics (schema → `.sql`, unapplied); enterprise `/privacy` draft; `recordAudit()` extended to roster/report. See `docs/OVERNIGHT_PLAN.md` |
| **Verified** | `tsc` ✓ · `lint` ✓ · `npm test` (34/34) ✓ · `build` ✓ — all **headless** (no live DB/keys in the sandbox) |
| **Next up** | Laptop: apply `prisma/sql/learned_options_per_org.sql` (by hand, NOT db push); legal review of `/privacy`; wire integration keys, deploy, smoke-test. See `docs/PHASE_F.md` + `docs/PRODUCTION_CUTOVER.md` |
| **Gate status** | Pre-real-user gate: privacy now an enterprise draft (legal review pending); RLS live-applied. Rate-limit keys + final cutover still outstanding |

---

## Phase plan (letters, as embedded in code)

- [x] **A** — schema hardening (multi-tenant cols, Worker/Org/AuditLog, roles)
- [x] **B** — sectorConfig label maps + identity/sector seam (Rule 4)
- [x] **C** — PII scrub (Rule 2) + output validation/fallback (Rule 11) + idempotency (12) + local backup (8)
- [x] **D** — SQLite → Postgres cutover. Code-complete; **tested live on Supabase** (aws-1, :6543)
- [x] **E** — Supabase magic-link auth + RLS. Code-complete:
  - Step 1 (auth/middleware/Worker provisioning) — **tested live**
  - Step 2 (tenant columns stamped, `userId` NOT NULL, RLS + auth-hook SQL) — **code-complete, live SQL apply pending**
  - Step 4 (`DEV_AUTH` sandbox bypass, hard-gated off in prod) — done
- [x] **F** — go-live integrations. **Code-complete, inert without keys:**
  - `/api/health` uptime probe (live now, no config)
  - Stripe billing — plumbing + `/billing` UI + signature-verified webhook → AuditLog + PostHog/Sentry + transactional emails + **server-side admin check**
  - Observability/email — Sentry, PostHog, Resend (all env-gated)
  - Photos → Supabase Storage — relative paths (Rule 3) + signed URLs; inline data-URL fallback when no bucket
  - Tests (25, `npm test`/`npm run test:db`) + CI (`.github/workflows/ci.yml`) + `prisma/sql/schema_baseline.sql`

---

## Pre-real-user gate (ALL must be true before the first real user)

- [x] Postgres migration (Phase D — live on Supabase)
- [x] Real auth — Supabase magic-link (Phase E Step 1)
- [x] RLS hardened via JWT claims — **APPLIED LIVE + cross-tenant verified** (Supabase, all 6 `verify_rls_editor.sql` checks pass). Fixes found during apply: restore API-role grants after `--force-reset`, guard `_prisma_migrations` for `db push`, and tightened `WITH CHECK` to block cross-tenant insert/reassign
- [x] PII scrubbing (Phase C, Rule 2)
- [~] Rate limiting + hard spend cap — **throttle scaffolded** (`src/lib/rate-limit.ts`, Upstash REST, on `/api/generate-note`, fail-open, inert without keys). Needs Upstash keys live; hard spend cap still provider-side (AI Studio budget)
- [x] Graceful LLM fallback + output validation (Phase C, Rule 11)
- [x] `/api/health` (Phase F — **done**)
- [~] Privacy policy — **enterprise draft live** (`/privacy`, 13 sections, marked draft/not-in-effect); legal review (Privacy Act / NDIS) + placeholder fill (entity, contact, sub-processors, retention) pending
- [x] Landing page + waitlist — **public marketing page live at `/`** (dashboard moved to `/dashboard`; signed-in users auto-redirect there) **with working waitlist capture** (`WaitlistSignup` table, `joinWaitlist` action, deny-by-default RLS). Placeholder copy/branding still to refine
- [ ] `anonymiseUser()` right-to-erasure (needs full NDIS Participant fields first)

---

## What's left — needs YOUR laptop / credentials

Full detail in **`docs/PHASE_F.md`** (go-live) and **`docs/PRODUCTION_CUTOVER.md`** (D/E).

1. **DB (laptop):** `prisma migrate dev --name init` (or paste `prisma/sql/schema_baseline.sql`), then `search_vector.sql` → `auth_hook.sql` (+ enable the hook in the dashboard) → `rls_policies.sql`.
2. **Credentials:** Stripe (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`) · a **private** `shift-photos` bucket · `RESEND_API_KEY` · `NEXT_PUBLIC_POSTHOG_KEY` · `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`.
3. **Deploy** to Vercel.
4. **Smoke tests:** `npm run test:db` · RLS BOLA test (org-A can't read org-B) · Stripe subscribe→portal→cancel · photo add/reload/edit (stores paths, not base64).

**Decisions to lock:** Stripe plan (price/interval/trial) · `EMAIL_FROM` + sending domain · which of Sentry/PostHog/Resend to enable at launch.

---

## Schema — done vs deferred

**Done (Postgres):** multi-tenant columns; Organisation (incl. `stripeCustomerId`, `subscriptionStatus`); Worker/User (`supabaseUserId @unique`); AuditLog (now **written** via `recordAudit()`); ShiftReport metadata + approval flow; idempotency on Shift + LogEntry.

**Deferred:** full NDIS Participant fields; soft-delete (`deletedAt`/`anonymisedAt`); FeatureFlag table; pgcrypto; `billingCycle` + `stripeSubscriptionId` on Organisation; `anonymiseUser()`. NOTE: `activitiesLog`/`incidentFields` exist but aren't populated by app code yet.

**RBAC/audit frame (code-complete, SQL unapplied):** AuditLog hash-chain cols (`seq`/`prevHash`/`hash` → `audit_hash_chain.sql`); `Membership` / `ParticipantAccessGrant` / `Consent` (→ `rbac_grants.sql`). Both reflected in `schema_baseline.sql`. Apply by hand on the laptop **before deploy** — `recordAudit()` writes the chain cols, and `resolvePrincipal()` reads the grant tables (resilient if absent, but the chain won't persist until applied).

---

## The 12 architectural rules — never break

1. No LLM calls outside `src/lib/ai.ts`
2. No PII to any external API (scrub first) — *Phase C*
3. No absolute file paths in the DB (relative only) — *Phase F: photos store relative Storage paths*
4. No hardcoded sector terminology in JSX (sectorConfig) — *Phase B*
5. No hardcoded single-tenancy (`organisationId` nullable) — *Phase A*
6. No SQLite in production — *Phase D live*
7. No auth shortcuts (Supabase Auth + JWT-hardened middleware) — *Phase E*
8. No form submit without local-state backup — *Phase C*
9. No sensitive action without an AuditLog entry — *Phase F: billing events; Caira overnight: `recordAudit()` covers roster + report actions; **CC: AuditLog is now tamper-evident — per-org hash chain, `verifyAuditChain()`***
10. No new table without `userId` + `organisationId?` — *Phase A/E*
11. No LLM output shown without validation (check, retry, fallback) — *Phase C*
12. No shift mutation without an idempotency key — *Phase C*

---

## Decision log (newest first)

- **2026-06-27** — **cw: landing page = Sales Site Direction B (teal), confirmed.** Edward picked the **teal** scheme of the 3 in `docs/design/Caira Sales Site.dc.html` — that's **Direction B** (labelled TEAL; already the locked `initialDirection=B`). The live `/` is still a placeholder, so queued a cc task: rebuild `src/app/(public)/page.tsx` to match the Sales Site Direction B (switcher hidden, public). Added to `START_PROMPT_CC.md`.

- **2026-06-27** — **cw: Medication Visual Verification + Authorisation spec captured (`docs/MED_VERIFICATION_SPEC.md`); building in parallel.** New feature (Edward voice session, decisions locked): (a) in-app **photo verification** of prepared pills via Claude Vision behind `src/lib/ai.ts` — **decision-support only**, low-confidence→mismatch, override needs a reason, never auto-proceed; (b) phased **medication reference DB** (internal *structured* pill-appearance fields now → MIMS post-revenue, clean mapping); (c) a **hard-gated authorisation state machine** `DRAFT→PENDING_BSP→PENDING_COMMISSION→PENDING_GUARDIAN→ACTIVE` (DB-enforced, not UI) with guardian/family in-platform confirmation. **Sequencing = now, in parallel:** cd designs the med-admin/verification + `/console` authorisation + guardian-confirm screens (SSOT-first) while cc continues G2 and may start the design-independent backend (state machine + schema + vision lib). Updated `START_PROMPT_CD.md` + `START_PROMPT_CC.md`. **Legal-gated, dummy data only** (meds + chemical restraint + guardian authorisation + NDIS Commission).

- **2026-06-27** — **cw: site LIVE on caira.net.au · G2 design SSOT landed · expanded seed staged.** (1) Vercel custom domain **www.caira.net.au** (apex 308→www) is public & live — marketing at `/`, `/login` magic-link, `/dashboard` still `@caira`-allowlisted. Standard Protection left ON (custom domains are exempt; the `*.vercel.app` URLs + previews stay private). Verified the marketing page renders publicly. (2) Landed cd's **5 Phase G design screens** into `docs/design/` SSOT (`1b82a12`): Participant Hub + RP Incident (tablet), Incidents + Notifications + eMAR (phone), + 25 screenshots, a DC-runtime `support.js` bump, and HANDOFF.md G2 entries (incl. the **RP field→`Incident` column map** for wiring). Repointed each DC's `_ds/<uuid>/` refs to the in-folder `design-system/` (byte-identical bundle). **→ cc is now UNBLOCKED for the G2 wire-up** (see refreshed `START_PROMPT_CC.md`). (3) Staged an **expanded `prisma/seed.ts`** (one account per Role + hub WORKER/FAMILY/GUARDIAN capacities for participant 'Zef') at `_seed_expanded/` for cc to verify-gates + push. **Testing note:** `DEV_AUTH` act-as-anyone can't run on Vercel (hard `NODE_ENV` gate) — local-only.

- **2026-06-27** — **cw: hub + RP schema applied live.** `prisma/sql/hub.sql` and `prisma/sql/restrictive_practice.sql` applied to the live Supabase DB via the SQL Editor (idempotent, additive); `verify_rls_editor.sql` re-run **green — ALL RLS CHECKS PASSED**, confirming the three new `Hub*` tables enabled RLS. Live schema now matches `main` (`faa4e21`). Still dummy-data only; real-data gate unchanged (lawyer).

- **2026-06-27** — **cw: hub backend slice merged to `main` (`b955b8c`).** Verified cc's slice on `claude/pensive-hamilton-hj1cpu` (`ad8239c`) was **purely additive** (9 files, +1114/−6; does not touch `COMMAND_CENTRE.md`) and merged it `--no-ff` into `main` via a clean clone + laptop push (`7af5e92..b955b8c`) — **zero conflicts**, net change == exactly the 9 branch files, and the prior `AUTH_ALLOWLIST` entry + `apply_phase_g_supabase.sql` remained intact post-merge. (Gate-green — `tsc`/`lint`/`183 tests`/`build` — is cc's branch result; the cw sandbox's 45s command cap can't run `npm ci`+build, so a laptop/cc gate re-run is the belt-and-suspenders check.) **DB applies — DONE LIVE 2026-06-27 (Supabase SQL Editor, never `db push`):** `prisma/sql/hub.sql` (3 new `Hub*` tables + RLS, 5 nullable `LogEntry` cols + shiftId nullable, `Worker` PIN cols, idempotent COALESCE-guarded backfill of existing `LogEntry` rows) then `prisma/sql/restrictive_practice.sql` (11 RP cols on `Incident`), then re-run `verify_rls_editor.sql` (**ALL RLS CHECKS PASSED** — new `Hub*` tables came up RLS-locked). Structural + dummy-data only; real-data gate unchanged. **Next:** G2 wire-up is cc's, gated on cd committing the hub/RP `.dc.html`.

- **2026-06-27** — **cw session: preflight clean · live `AUTH_ALLOWLIST` set · Supabase apply-script committed.** Ran `docs/CW_PREFLIGHT.md`: `.git/HEAD` + index intact, `maintenance.auto` off, `git fsck` clean apart from a **non-fatal corrupt multi-pack-index** (git falls back to regular packs — left as-is rather than risk a mount-blocked delete). The **mounted repo was 25 commits behind** true `origin/main` (`1fd67ef`), with a working tree full of NUL-byte phantom diffs + stale files — verified per the runbook that **none were real uncommitted work** (every `M` file was either pure NUL noise or an older-than-HEAD stale copy). Set the live **`AUTH_ALLOWLIST`** in Vercel Production to `@caira.app, @caira.net.au` (**domains only** — `edward.neppl@gmail.com` deliberately excluded this round) and **redeployed** (`6b65aac`); open magic-link sign-in is now closed. Committed **`prisma/sql/apply_phase_g_supabase.sql`** (the flattened, Supabase SQL-Editor-safe twin of `apply_phase_g.sql`) to `main` via a clean clone + laptop push (`1fd67ef..6b65aac`). The root-level `verify_rls_editor.sql` on the mount was a **byte-identical duplicate** of the already-tracked `prisma/sql/verify_rls_editor.sql`, so not re-added. **Guardrail held:** never commit/push from the corrupting mount — clean clone + laptop push, as used here.

- **2026-06-27** — **Phase G G0 (cc): consolidated the 3 stranded backend branches into one green branch + one ordered SQL apply script.** Per `docs/START_PROMPT_CC.md`. Discovered `origin/main` is stale at `0d15bb37` (lacks Caira/Sage-&-Clay/Phase-G — all on `claude/youthful-bardeen-8ppnpp`), and that npm install + `prisma generate` DO work in this session (not network-gated this time), so the full toolchain could actually run. Established a green baseline on `youthful-bardeen` (`tsc`/`lint`/`test`/`build`), then merged **in order, re-verifying green after each**: `serene-feynman-p80kpr` (Phase 0, no conflict) → `pensive-allen-md8h6h` (Phase 1.6; resolved `rbac.ts`/`rbac.test.ts` SUPERADMIN-override conflicts to the named `PLATFORM_ROLE` constant, kept both test bodies) → `elegant-davinci-551vkd` (Phase 2; only `COMMAND_CENTRE.md` conflicted, took ours). Final: **173/173 tests, `tsc`/`lint`/`build` all green.** Built **`prisma/sql/apply_phase_g.sql`** — the single ordered idempotent apply script (Phase 0 `apply_all_features` → Caira ×3 → 1.6 erasure/NDIS → 2.4 price-guide), `ON_ERROR_STOP`, dry-run note, **validated against a throwaway Postgres 16 (clean fresh apply + idempotent re-run; every new table + column + RLS verified)**. Updated `AUTH_ALLOWLIST` docs/test for both `@caira.app` + `@caira.net.au` (decision #2; parser already data-driven). Scoped eslint to app source (excl. `docs/design/` prototypes) for a green baseline. **Branch pushed; merge to `main` + SQL apply + live `AUTH_ALLOWLIST` are Edward-gated.** **Edward TODO:** review+merge `youthful-bardeen`→`main`; `psql "$DIRECT_URL" -f prisma/sql/apply_phase_g.sql` then `verify_rls_editor.sql`; set live `AUTH_ALLOWLIST`.

- **2026-06-26** — **Phase 0 (cc): foundation hardening — ordered SQL apply + RLS sweep, LLM spend cap, tenant-scope CI guard, SUPERADMIN wiring** (branch `claude/serene-feynman-p80kpr`, commit `78661b9`). The "safe to take money + real data" layer, no design dependency (IMPLEMENTATION_PLAN_MVP §2). **0.1 Ordered SQL apply:** `prisma/sql/apply_all_features.sql` — one `ON_ERROR_STOP`'d, idempotent, `\i`-include script that applies the 13 unapplied feature files **in dependency order** (`audit_hash_chain` + `rbac_grants` FIRST), then the RLS sweep LAST; plus `prisma/sql/feature_tables_rls.sql` — a post-apply sweep that enables RLS + a per-table `tenant_isolation` policy on the feature tables whose DDL shipped **without** RLS (incl. `Membership`/`ParticipantAccessGrant`/`Consent`/`ParticipantCareProfile`, whose RLS existed only as commented-out SQL). **Validated against a throwaway Postgres 16** (clean, idempotent, every swept table RLS-enabled). **0.2 SUPERADMIN wiring:** legacy `can(role, cap)` now honours `SUPERADMIN` as the platform override without polluting `ROLE_CAPABILITIES`. **0.3 Hard LLM spend cap + budget alarm:** `rate-limit.ts checkSpendCap()` (global per-UTC-day ceiling) wired into `/api/generate-note` + `/api/transcribe` (503 on breach), env-gated, fail-open, PostHog `llm_budget_alarm`; new `UPSTASH_*`/`LLM_DAILY_CAP`/`LLM_DAILY_ALARM_FRACTION` env. **0.4 CI tenant-scope guard:** `scripts/check-tenant-scope.mjs` + `npm run check:tenant-scope` + CI step — an unscoped tenant-table list/bulk read is a cross-tenant leak (the Prisma-RLS-bypass is load-bearing); 5 legitimate cross-tenant reads annotated `// tenant-ok:`. **0.5** all four integrations env-gated + PostHog behind `hasAnalyticsConsent()`. **+tests.** **Headless caveat:** Prisma engine CDN network-gated in the web sandbox, so `prisma generate → tsc/build` can't run here — changed tests pass, lint clean, residual failures are all missing-generated-client cascades (green in CI). **Edward TODO:** `psql "$DIRECT_URL" -f prisma/sql/apply_all_features.sql` by hand (NOT `db push`) then `verify_rls_editor.sql`; provision Upstash + set `LLM_DAILY_CAP`; MFA on the SUPERADMIN seat.

- **2026-06-26** — **Phase 2.5 (cc): SCHADS award (MA000100) pay-interpretation core** (branch `claude/elegant-davinci-551vkd`). Enterprise-depth payroll interpretation built as a **rules engine parameterised by a swappable, verify-before-use config** — SCHADS multipliers change at every Fair Work annual wage review (+3.5% from 2025-07) and the rate-table sites 403 through the agent proxy, so hardcoding numbers as authoritative would be wrong. Same pattern as the NDIA price guide: **the engine owns the structure, Edward verifies the numbers.** `src/lib/schads.ts` (pure): `ordinaryMultiplier` (permanent vs casual; casual loading *added* per SCHADS, or *compounded*, via config), `splitOvertime` (daily ordinary→first-2h→after buckets), `payForShift` (day penalty Sat/Sun/PH, evening/night **shift loading applied higher-of** with weekend/PH — no double-stacking, overtime, casual loading on OT, flat sleepover + broken-shift allowances), `classifyDay` (PH > Sun > Sat > weekday). `DEFAULT_SCHADS_CONFIG` is clearly marked **UNVERIFIED** — confirm against the current MA000100 pay guide before real payroll. **10 pure tests (custom round-number config so they test the engine, not the defaults), green via tsx.** **Edward TODO:** verify/replace the default multipliers + allowance amounts against the live Fair Work MA000100 pay guide; later wire to roster hours + a state public-holiday calendar.

- **2026-06-26** — **Phase 2.2 (cc): offline outbox / sync-engine core** (branch `claude/elegant-davinci-551vkd`). Researched + reassessed 2.2 first: the app's writes are **idempotent server actions** (client `@unique idempotencyKey`, server dedupes a replay → no-op), so replay is already safe; and per the current Serwist/Next-16 guidance, **service workers must not cache/replay server-action POSTs** (RSC-encoded, build-varying action IDs) — the architecture is SW(app-shell+reads) + client IndexedDB outbox + server idempotency + optional route-handler replay mirror. So 2.2 splits into a buildable core and an env/design-gated wiring half. Built the core: `src/lib/offline-sync.ts` (PURE — no IndexedDB/SW/network/`Date.now()`, time injected, fully headless-testable): `enqueue` (monotonic seq + stable idempotency key), `drainBatch` with **per-entity serialisation** (a clock-off can never replay before its clock-on; distinct entities sync in parallel), retry-with-exponential-backoff + terminal-failure, `reconcile` (a server **duplicate = success**, a rejection = terminal, transient = retry), `purgeSynced`, `summarise` (the pending/syncing/synced/failed badge state). **10 pure tests, green via tsx.** **Deferred (env/design-gated):** `@serwist/next` service worker + manifest + PWA shell (needs `node_modules` + the local Next 16 docs + live browser test), the IndexedDB binding + route-handler replay mirror, and cd's offline UI states. Same headless caveat (`tsc/lint/build` not runnable in the web sandbox).

- **2026-06-26** — **Phase 2.4 (cc): NDIS price-guide importer + real bulk-upload claim CSV** (branch `claude/elegant-davinci-551vkd`, commits `7b864e5`+`b840e51`). Built the AU NDIS Support Catalogue importer — the periodic NDIA spreadsheet has no public API, and it's national **reference data, not participant data**, so it sits outside the legal/real-data gate. `src/lib/price-guide.ts` (pure): RFC-4180 CSV parser, fuzzy NDIA header mapping (case/punctuation-insensitive, survives release-to-release column drift), dollars→integer-cents, per-region price caps (`act_nsw_qld_vic` / `nt_sa_tas_wa` / `remote` / `very_remote` / `national`, with national fallback), and `validateClaimLine()` — the load-bearing over-cap/quote/unknown compliance check. `billing-claims.ts`: `toNdisBulkCsv()` realises the exact 16-column NDIA **bulk payment request** template that `toClaimCsv` had left as "a later refinement" (GST defaults to P2/GST-free). Schema: `NdisSupportItem` reference model — global like `LearnedOption` seeds (`organisationId` NULL = shared) with org-private override rows, integer-cent caps per region; SQL artifact `prisma/sql/ndis_price_guide.sql` (**UNAPPLIED**, world-readable RLS for globals, hand-apply convention — NOT `db push`). Wired into `billing-claims-actions.ts`: `importPriceGuide()` (BillingManage-gated, audited `PRICE_GUIDE_IMPORTED`, upsert by code+org) + `checkClaimAgainstGuide()` (warn-don't-block, org override beats global seed, region from state). **7 new pure tests (10/10 green via tsx).** Headless caveat unchanged: `tsc/lint/build` not runnable in the web sandbox (deps network-gated, no `node_modules`) — the server action + new model type-check/build on the laptop after `prisma generate`. **Edward TODO:** apply `ndis_price_guide.sql` by hand + add `NdisSupportItem` to `schema_baseline.sql`; confirm which NDIA price-guide file/version to load (open Phase-2 decision). Phase 2.4 budgets/claims item is now code-complete; rest of Phase 2 (2.1 `/portal`, 2.2 offline/PWA, 2.3 messaging/handover, 2.5 enterprise depth) remains design-gated / after-first-revenue.

- **2026-06-26** — **Caira email + domain decisions (handover from Cowork chat).** Q: personal Gmail to manage Caira, or a dedicated `@caira.net.au`? **Decision: dedicated custom-domain email via Google Workspace** (Gmail UI/reliability, but `@caira.net.au` addresses) — professionalism/trust, domain-as-asset (mailboxes outlive any individual), separation from `edward.neppl@gmail.com`, and it scales to staff. Cheaper fallbacks if needed: Zoho free tier, or registrar forwarding into Gmail with "send as" (outgrow quickly). **Mailbox plan:** real seats `admin@` (root/owner/billing — never public), `hello@` (public front door / contact form), `support@` (participant/NDIS day-to-day, → shared inbox as staff grow); free aliases `accounts@`/`invoices@`, `noreply@` (app outbound), `privacy@`, `careers@`, `info@`→`hello@`. Solo-stage: run `admin@` as the one seat, others as aliases; split out later. **Setup must-dos:** SPF + DKIM + DMARC DNS records (or mail → spam) and catch-all routed (not rejected). **Domain/`www`:** `caira.net.au` already registered (sole-trader ABN — see 2026-06-25 below); no `www` needed — use the **bare apex as primary** + a `www → apex` 301 redirect for safety. Email is independent of `www` (uses MX records). ⚠️ **Allowlist mismatch flagged for follow-up:** the app trusts **`@caira.app`** for login (`.env.example` line 51 `AUTH_ALLOWLIST`, `test/allowlist.test.ts`), but marketing + the registered domain are **`caira.net.au`**. Staff mailboxes on `caira.net.au` would be **denied login** until `AUTH_ALLOWLIST` (and the test) include `@caira.net.au`. **Edward to confirm canonical domain(s)** — likely both (`caira.app` for the app, `caira.net.au` for AU marketing, allowlist covers both) — then a one-line `.env`/test update lands it. No code changed this session (advisory + this ccu only).

- **2026-06-25** — **Overnight build runbook codified** (`docs/OVERNIGHT_BUILD.md`, on branch `claude/ecstatic-maxwell-i094f9`). A checkpointed work queue for the two autonomous roles — **cc** (logic, `src/`) and **cd** (design, `docs/design/`) — built off locked decisions. Resume protocol up top (reattach → `npm ci` → confirm headless-green baseline → one atomic task), an atomic definition-of-done (green `tsc`/`lint`/`test`/`build` + commit + unapplied `prisma/sql` + graceful degradation + ledger tick + "Next up" pointer + ccu), a two-lane progress ledger, and an **Edward-gated fence** (live DB apply, keys/credentials, secret rotation, `/privacy` legal review, deploy/Vercel/Supabase toggles/tester invites) agents must never touch. Queue derived from `backlog.md` (remaining cc-startable = participant/NDIS-plan #4 → `anonymiseUser()` erasure → populate `activitiesLog`/`incidentFields` → verify Phase-5 competency gate) + `design/HANDOFF.md` (Modules/Pricing `.dc.html`, reconcile Home to `.dc.html`, design the shipped-but-undesigned product surfaces). Decision-gated items (offline sync, NDIS price-guide feed, embeddings provider, server TTS) held out until Edward locks the decision.

- **2026-06-25** — **AI entry-clarifying prompts (chips + voice) with an admin-tunable cap.** While logging, the worker gets short, human, entry-specific questions ("Did Sam buy anything while you were out?") instead of generic prompts — tailored to category + picked detail + participant first name. `ai.suggestEntryQuestions` (factual-only per house rules: no mood/feeling inference; PII-scrubbed name placeholdered→restored; ≤3; fails quietly). Server actions `getEntryQuestions` (chip, groups-based) + `getDraftQuestions` (voice review, detail-based), own-shift validated. UI: tap **"✨ Suggest what to add"** on a chip or any voice-review draft; **auto-suggest** also fires once for sparse-note chip entries and empty-note drafts. **Auto fetches are capped per shift** (manual taps uncapped), persisted in localStorage; the cap is an **org setting** — `Organisation.autoSuggestCap` (default 3, clamp 0–20, 0 = off) edited at **`/admin/settings`** (`Capability.OrgSettingsManage`, ADMIN, audited `ORG_SETTINGS_UPDATED`), read resiliently by `getOrgAutoSuggestCap`. Schema → `prisma/sql/org_auto_suggest_cap.sql` (+ baseline), **NOT applied** (falls back to 3). 85 tests; tsc/lint/build green.

- **2026-06-25** — **Timestamp accuracy for back-logged & verbal entries (warn, don't block).** End-of-shift batch logging now lands events at the time they happened, not all at "now". `shift-time.ts` (pure, overnight-aware): `minutesOfDay`/`isWithinWindow`/`timeWindowWarning`. Verbal: the model flags each time **stated vs estimated** (`timeEstimated` through `ai → note-extraction → NoteEntryDraft`); the review screen badges estimated times, warns on out-of-window / out-of-order, and editing a time clears the estimated flag. Chips: the time row is now a **"When did this happen?"** prompt (Now default, controlled input) with an out-of-window warning. Shift page passes `clockOnAt` for the window. Warn-allow-override throughout; server stays permissive by design. 85 tests; tsc/lint/build green.

- **2026-06-25** — **Participant-tailored capture chips (phases 1–5).** Each participant's chips are now driven by a care profile: condition tags seed editable **support-need flags** (`src/lib/care-needs.ts`, the source of truth), which switch chips on. Backed by [research](research/ndis-condition-chip-profiles.md) + [design](design/participant-care-profile.md). **P1** model/mapping (flags, condition→flags, resolution; pure, tested). **P2** filtering — shift page resolves the profile (resilient `getCareProfile` → null when unconfigured) and `ShiftTracker` (`TILE_KEYS ∩ visibleKeys`) + `DetailFields` (`needWhen`) tailor the grid; no profile → full grid (legacy unchanged). **P3** capability-gated editor `/participants/[id]/care-profile` (`CareProfileManage`) with audited save. **P4** need-gated tiles (Behaviour, Seizure, Repositioning) + IDDSI fluid/food groups (`needWhen=dysphagia`) + restrictive-practice group + note-extraction scoped to enabled chips. **P5** competency gating **deferred** (needs a worker-credentials model); hook in place (`HIGH_INTENSITY_NEEDS`/`isHighIntensitySupport`). Schema: `ParticipantCareProfile` → `prisma/sql/participant_care_profile.sql` (+ baseline), **NOT applied** (`getCareProfile` tolerates absence). 80 tests; tsc/lint/build green.

- **2026-06-24** — **Note → structured log entries (extract → review → confirm).** A free-text/dictated narrative can be split into multiple chip-categorised entries. `note-extraction.ts` (pure, unit-tested): the category catalogue is generated FROM `LOG_CATEGORIES` so the prompt can't drift; `mapExtractedToEntries()` validates categories, builds the chip-detail string (valid options only, `showWhen`, amount) and resolves relative times to absolute HH:MM on the note's date. `ai.ts → extractLogItems()` (JSON-mode Gemini behind the one AI seam, PII-scrubbed). `log-actions.ts`: `extractNotePreview()` (read-only drafts) + `commitExtractedEntries()` (creates entries **and** keeps the original note as their linked parent). UI: editable review list before anything saves (Rule 11). Schema: `LogEntry.derivedFromId` → `prisma/sql/note_extraction.sql` + `schema_baseline.sql`, **NOT applied** (writer degrades to unlinked entries until applied). Also fixed a live-transcription duplication bug (Web Speech `continuous` re-reports finals). 70 tests (was 58); tsc/lint/build green.
- **2026-06-24** — **Voice: live transcription added.**
- **2026-06-24** — **Voice: live transcription added.** On top of the batch path, the Mic tab now uses the **Web Speech API** (`SpeechRecognition`) where available (Chrome/Edge; Safari partial) so text streams into the note box **live** as the worker speaks; the box is read-only mid-dictation, editable on stop. Firefox (no support) falls back to the existing record → `/api/transcribe` Gemini path. Note: in-browser STT (Chrome) sends audio to Google's speech service — same cross-border caveat, different path than Gemini; both optional/gated. `src/lib/audio.ts` + `ShiftTracker.tsx`; tsc/lint/build green, 63 tests.

- **2026-06-24** — **Voice recording + transcription live.** Wired the shift-capture Mic tab end to end: `MediaRecorder` captures audio, the browser decodes + re-encodes to 16 kHz mono WAV (`src/lib/audio.ts`) for cross-browser support, POSTs to a new **`/api/transcribe`** route, and fills an **editable** note box the worker reviews before saving (Rule 11). Transcription stays behind `src/lib/ai.ts` (`transcribeAudio()` via the same Gemini key — Rule 1), is rate-limited + signed-in-only, and degrades to typing when no key/mic/permission. **PII caveat (Rule 2):** audio can't be scrubbed pre-send — the recording goes to Gemini to transcribe (unavoidable cross-border disclosure; gated behind `GEMINI_API_KEY`); note GENERATION still scrubs text. Revisit with a DPA / on-device STT before real participant data. Pure `cleanTranscript()` unit-tested. 63 tests (was 58); `tsc`/`lint`/`build` green.

- **2026-06-24** — **CC: RBAC frame completed — participant-grant access (Membership / ParticipantAccessGrant / Consent).** Built the missing half of the auth foundation: authorization is now the UNION of org-membership roles AND active participant-scoped grants (+ platform override). `can()` evolved to `can(principal, capability, resource)` (`src/lib/rbac.ts`) — org capabilities scope to the matching org, grant capabilities scope to the named participant only; legacy `can(role, capability)` kept for existing org-staff gates. Added participant-care capabilities (notes:read, medication:submit, routine:submit, handover:receive, feedback:submit, consent:manage) and seeded the `family_carer_clinical` + `participant_guardian` grant roles. `src/lib/access.ts`: `resolvePrincipal()` (memberships ∪ active grants, time-window gated, resilient to unapplied tables) + `authorizeParticipantAccess()` (check **and** audit, allow+deny both logged). New tables → `prisma/sql/rbac_grants.sql` + `schema_baseline.sql`, **NOT applied**. The **NLS / Zef / mother** scenario is a passing acceptance test (`test/access.test.ts`): an external `family_carer_clinical` carer can view notes + submit medication/routine + receive handover + give feedback for **Zef only**, nothing else, every decision auditable. 58 tests (was 47); `tsc`/`lint`/`build` green.
- **2026-06-24** — **CC: architecture that locks in (two non-retrofittable foundations).** Built the frame, not the features. (1) **Capability-based RBAC** (`src/lib/rbac.ts`): authorization now asks `can(role, Capability.X)` against a single `ROLE_CAPABILITIES` policy map instead of hardcoded role checks — the enterprise ~32-role / ~6-surface model slots in by editing that map alone, no auth re-plumbing. Migrated the server gates (roster/clock-amend/billing/shift-oversight); legacy `isRosteringRole`/`isWorkerRole` are now thin wrappers over `can()`, so behaviour is unchanged (ADMIN manages; WORKER/SOLO_WORKER work) and deny-by-default holds for the reserved roles. (2) **Tamper-evident AuditLog** (`src/lib/audit.ts`): per-org hash chain — `hash = sha256(prevHash + canonical(payload))`; edit/delete/reorder any row and every later hash breaks; `verifyAuditChain()` replays and finds the first break; appends serialised per chain via a Postgres advisory lock. Schema adds `seq`/`prevHash`/`hash` to AuditLog → `prisma/sql/audit_hash_chain.sql` + `schema_baseline.sql`, **NOT applied** to the live DB (laptop step). Pure RBAC + chain logic unit-tested (47 tests, was 34). `tsc`/`lint`/`build` green. Everything else (complaints register, WHS pathway, the 40 features) can stage in later — these two couldn't be cleanly retrofitted.
- **2026-06-24** — **ccu-to-main convention codified.** Cherry-picked this command centre onto `main` (so it stays canonical/branch-resolvable) and added a line to `AGENTS.md`: `docs/COMMAND_CENTRE.md` updates are always committed/pushed to `main`, even during a feature-branch session — overriding the session-branch restriction for that one file. The AGENTS.md line is on both `main` and the feature branch.
- **2026-06-24** — **Caira overnight build** (branch `claude/sharp-hypatia-6zdy2h`, see `docs/OVERNIGHT_PLAN.md`). Six-task autonomous session. (1+2) Confirmed the Caira rebrand (`APP_NAME`, Bricolage/Figtree, Sage & Clay) and the phone capture flow (`/shift/[id]`: chip grid → detail/type → finish → AI note) were already complete from prior commits — verified, no change. (3) Built **`/admin`** coordinator dashboard (`CairaAdmin`, `src/app/admin/page.tsx`) from the design SSOT, mock data, auth-gated by middleware — no `CairaAdmin.jsx` existed so authored as TSX per the no-standalone-jsx convention. (4) **LearnedOption #7**: picklists now scope to global seeds + the caller's org, new typed options stamped per-org, de-identified PostHog events on growth (`kind/name/useCount`, no tenant ids); schema change (per-org unique via `COALESCE`, RLS so globals stay world-readable) written to `prisma/sql/learned_options_per_org.sql` and **NOT applied** — code degrades gracefully under the current global-unique constraint. (5) Replaced the `/privacy` placeholder with a 13-section **enterprise privacy draft** (processor/controller, AI de-identification, sub-processors, AU residency, retention, OAIC NDB), clearly marked draft. (6) Extended `recordAudit()` to roster + report actions (Rule 9). `tsc`/`lint`/`build` green, 34 tests. NOTE: cloudflared can't run in the cloud sandbox (local-only tunnel workflow); COMMAND_CENTRE updated on the feature branch rather than main, since the session's branch rules forbid pushing elsewhere without explicit permission.
- **2026-06-24** — **App-layer tenant isolation (the other half of RLS).** Audit found that because Prisma bypasses RLS (Option A), the app's own reads/admin-rechecks scoped by *worker identity* but **not by organisation** — latent cross-tenant/IDOR risks that activate with a 2nd real org (admins reading other orgs' shifts/participants/notes; `/api/generate-note` and `/shift/[id]` by id; unscoped roster/notes list reads). Added `tenantScope(worker)` next to `tenantOwner` and applied it to all 6 findings (generate-note, shift page, roster-actions allocate/offer/cancel/create, clock-actions approve/reject, roster.ts + notes/dashboard list reads, quick-shift). Helper unit-tested. No behaviour change for the current single-org/solo setup. **Deferred (finding #7, design call):** `LearnedOption` picklists are global across orgs — the schema calls it a "shared global picklist", but RLS scopes it; decide whether picklists should be per-org before multi-org launch. tsc/lint/build green, 34 tests.
- **2026-06-24** — **RLS APPLIED LIVE + verified (milestone).** Live Supabase cutover on Windows via `prisma db push --force-reset` (CLI reads `DIRECT_URL` via `prisma.config.ts`; SQL run through the Supabase SQL Editor, no psql). All 6 cross-tenant checks pass. Three real fixes surfaced during apply: (1) `--force-reset` drops/recreates schema `public`, stripping Supabase API-role grants → added `prisma/sql/grant_api_roles.sql` (cutover step E0); (2) `rls_policies.sql` errored on `_prisma_migrations` (not created by `db push`), which rolled back the whole script and left RLS OFF → guarded with `to_regclass`; (3) `WITH CHECK` was `own OR org`, allowing a Data-API caller to plant a row they own into another org → added `AND (org IS NULL OR org = claim)` on the data-table/Worker/AuditLog policies. App unaffected throughout (writes via Prisma, bypasses RLS). Remaining for RLS: live JWT/auth-hook smoke test (sign in → token carries top-level `organisationId`).
- **2026-06-23** — **RLS audit + automated cross-tenant check.** Reviewed `rls_policies.sql` / `auth_hook.sql` / `backfill_tenant.sql` — design is sound (Option A, `WITH CHECK` blocks tenant reassignment, signed top-level org claim, append-only AuditLog). Added `prisma/sql/verify_rls.sql` (+ `npm run verify:rls`): a deterministic BOLA check that injects `request.jwt.claims` for two simulated orgs/users and asserts no cross-tenant read, anon deny-by-default, `WITH CHECK` blocks cross-tenant insert, cross-tenant UPDATE hits 0 rows, and **every `public` table has RLS enabled** (regression guard for new tables). Runs in a rolled-back transaction. The live apply + run is still laptop-gated (no live Postgres in the sandbox). Minor flags logged for the cutover: global `LearnedOption` rows are invisible to the Data API under RLS (fine — app reads via Prisma); intra-org RBAC is app-layer, not RLS.
- **2026-06-23** — **Waitlist capture.** Added `WaitlistSignup` (non-tenant, unique email) to the schema + `schema_baseline.sql`; `joinWaitlist` server action (`waitlist-actions.ts`) with the pure helpers split into `waitlist.ts`; `WaitlistForm` (useActionState) on the landing hero; deny-by-default RLS (enable-RLS-no-policy, like `_prisma_migrations`) since the table holds raw emails and the Prisma role bypasses RLS to insert. Duplicate signup is treated as success (no email-enumeration leak). 30 tests pass. NOTE: no admin UI yet — read signups via the Supabase table editor / a query until one exists.
- **2026-06-23** — **Landing page.** Took the routing fork: dashboard moved `/` → `/dashboard`; `/` is now a public marketing landing (sector-aware copy via sectorLabels, Rule 4). Signed-in users auto-redirect to `/dashboard` (skipped under DEV_AUTH so the sandbox can preview). Updated post-login redirect, BottomNav home tab, the three back-links, and the auth public-path allowlist (`/`, `/privacy`). Copy/branding are placeholder; waitlist/trial not yet wired. `tsc`/`lint`/`build` green, 27 tests pass.
- **2026-06-23** — **Phase 0 gate, headless slice.** Knocked out the items that don't need the laptop: rate-limit throttle on the LLM endpoint (Upstash REST, dependency-free, fail-open, no-op without keys) + `/privacy` placeholder route. Health endpoint confirmed already done (Phase F). RLS left for the credentialed session (needs live Postgres — can't be exercised on the sandbox's SQLite). `tsc`/`lint`/`build` green, 27 tests pass.
- **2026-06-23** — **Phase F complete (code).** Health probe; Stripe billing (plumbing + `/billing` UI + webhook→AuditLog + analytics + transactional emails); Sentry/PostHog/Resend; photos→Supabase Storage (relative paths + signed URLs, inline fallback); 25 tests; CI; phone-pasteable `schema_baseline.sql`. **Security review** caught + fixed a HIGH issue: billing server actions enforced admin in the UI only — now re-checked server-side (`isRosteringRole`). Also Phase E Steps 2 & 4 landed (tenant stamping + `userId` NOT NULL + RLS/auth-hook SQL; `DEV_AUTH`).
- **2026-06-23** — Phase E Step 1 live & tested (magic-link auth end-to-end; middleware; Worker provisioning; Postgres live aws-1:6543; seed data).
- **2026-06-22** — Phase D cutover verified pre-run.
- **2026-06-21** — Reconciled with repo main; Phase A–F letter plan; GitHub handle is "Shmitzer".
- **2026-06-21** — Command Centre created.

---

## Reference

- `docs/PHASE_F.md` — per-integration go-live checklist (env vars, dashboard setup, smoke tests)
- `docs/PRODUCTION_CUTOVER.md` — Phase D/E runbook (DB migrate + RLS/auth apply order)
- `docs/ACCESS_CONTROL.md` · `AGENTS.md` · `CLAUDE.md`
- Drive (strategy, phone-first): "Edward's Command Center — DSW App" (vision / MRR / calendar) + the daily "RIGHT NOW" one-liner the briefing reads.
