# Caira — Page Inventory for Design (cd)

**Purpose:** the complete list of every page/route in the live app (`src/`), so cd
can design (or reconcile) each one against the Sage & Clay system. This is the
"what surfaces exist" map; the **how-it-should-look** detail lives in
`HANDOFF.md`, the `.dc.html` prototypes, and `screenshots/`.

- **Design SSOT:** `docs/design/` (this folder). Design changes here *first*, then
  `src/` is rebuilt to match — never the other way round (see `../../CLAUDE.md`).
- **Tokens:** all colour/type/radius live in `src/app/globals.css` ("Sage & Clay" —
  sage `--brand:#0f766e`, clay `--clay:#df5b40`, warm-paper `--background:#f3ebdd`).
  If a hex changes in the design, change it there.
- **No standalone `.jsx`** render-outside-the-app components. Every screen below is a
  real App-Router route in `src/app/` (TSX).
- **Last mapped:** 2026-06-26 (against `src/app/` route tree).

---

## Coverage legend

- ✅ **Designed** — has a `.dc.html` prototype and/or screenshots; src should match it.
- 🔶 **Partial** — some design exists (tokens/components reused) but no dedicated prototype.
- ⬜ **Undesigned** — shipped functional but never given a design pass. **cd's backlog.**

---

## 1. Public / unauthenticated (`src/app/(public)` + `auth/`)

| Route | File | Purpose | Coverage |
|---|---|---|---|
| `/` | `(public)/page.tsx` | **Marketing landing.** Public hero + waitlist capture. Signed-in users auto-redirect to `/dashboard`. Copy/branding still placeholder. | 🔶 Partial — never had a marketing `.dc.html`; needs a real landing design. |
| `/login` | `(public)/login/page.tsx` | Passwordless magic-link sign-in (enter email → link). | ⬜ Undesigned |
| `/privacy` | `(public)/privacy/page.tsx` | Enterprise privacy-policy draft (13 sections, long-form, marked draft). Needs a readable long-doc layout. | ⬜ Undesigned |
| `/auth/denied` | `auth/denied/page.tsx` | Shown when a signed-in email isn't on the allowlist; offers sign-out. | ⬜ Undesigned |
| `/auth/auth-code-error` | `auth/auth-code-error/page.tsx` | Magic link couldn't be verified (expired / wrong device). | ⬜ Undesigned |

> `/auth/confirm` (`auth/confirm/route.ts`) is a server redirect handler — **no UI**, no design needed.

---

## 2. Authenticated app (`src/app/(protected)`)

Shares the protected `layout.tsx` (app chrome / bottom nav). Phone-first; tablet/web
variants exist in `Caira Tablet & Web.dc.html`.

| Route | File | Purpose | Coverage |
|---|---|---|---|
| `/dashboard` | `(protected)/dashboard/page.tsx` | **Worker home** — role-aware: 3 status cards + shift auctions + calendar for workers; placeholder for rostering staff. | ✅ Designed — `Caira Tracker.dc.html` + tracker screenshots. |
| `/shift/[id]` | `(protected)/shift/[id]/page.tsx` | **The core screen** — live shift tracker: chip-grid capture, voice/Mic tab, end-of-shift AI report. Where a worker spends the shift. | ✅ Designed — `Caira Tracker Wireframe.dc.html`, `mockups/caira-shift.html`, phone-capture/voice screenshots. |
| `/notes` | `(protected)/notes/page.tsx` | Progress Note Generator — pick participant, generate/review AI notes, recent-notes list. | 🔶 Partial — uses tracker components; no dedicated prototype. |
| `/participants/[id]/care-profile` | `(protected)/participants/[id]/care-profile/page.tsx` | Coordinator/clinical editor for a participant's condition tags + support-need flags (drives which capture chips appear). | 🔶 Partial — spec in `participant-care-profile.md`; no `.dc.html`. |
| `/billing` | `(protected)/billing/page.tsx` | Organisation subscription (Stripe checkout/portal). Admin-only controls; graceful notice when Stripe unconfigured. | ⬜ Undesigned |

---

## 3. Admin / coordinator (`src/app/admin`)

| Route | File | Purpose | Coverage |
|---|---|---|---|
| `/admin` | `admin/page.tsx` | **Coordinator dashboard** (`CairaAdmin`) — oversight of everyone on shift, alerts, on-call, day-at-a-glance. Currently **mock data**. | ✅ Designed — built from the `Caira Tablet & Web.dc.html` / tablet-overview screenshots; reconcile src to match. |
| `/admin/settings` | `admin/settings/page.tsx` | Live organisation settings (e.g. auto-suggest cap). Admin-only, writes the real Organisation. | ⬜ Undesigned |

---

## 4. API routes — NO design needed

These are server endpoints with no UI; listed only for completeness so they're not
mistaken for missing screens:

- `api/generate-note/route.ts` — AI progress-note generation
- `api/transcribe/route.ts` — voice → text
- `api/health/route.ts` — uptime probe
- `api/stripe/webhook/route.ts` — Stripe webhook → AuditLog

---

## cd priority backlog (undesigned, highest-impact first)

1. **`/` marketing landing** — first impression + waitlist conversion; currently placeholder copy/branding. Needs a real `.dc.html`.
2. **`/login` + `/auth/denied` + `/auth/auth-code-error`** — the whole auth entry path; small, do as one consistent set.
3. **`/admin/settings`** — make the live settings surface match `/admin`'s designed look.
4. **`/billing`** — subscription/plan screen (admin).
5. **`/privacy`** — long-doc readable layout (low urgency, but it's public).
6. **Reconcile partials** (`/notes`, `/participants/[id]/care-profile`) to dedicated prototypes rather than borrowed components.

> When you design any of these: add the `.dc.html` + screenshots here, note it in
> `HANDOFF.md`, then flag cc to rebuild the matching `src/` route. Keep tokens in
> `globals.css` — don't hardcode hexes in JSX.
