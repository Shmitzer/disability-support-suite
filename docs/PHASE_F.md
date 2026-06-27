# Phase F — go-live integrations

Phase F adds the production plumbing: an uptime probe, Stripe billing, error/analytics/email,
and shift photos in Supabase Storage. **Everything except the health probe is env-gated and
inert until its keys are set** — the app runs fine with all of them blank.

This is the activation checklist. Set the env vars (see `.env.example`), do the dashboard
setup, then run the smoke test for each.

---

## 1. Health probe — `GET /api/health`

Live already; no config. Public + uncached. Runs `SELECT 1`:

- `200 {status:"ok"}` — app + DB healthy
- `503 {status:"error"}` — DB unreachable

**Point an uptime monitor (e.g. UptimeRobot) at `/api/health` and alert on non-200.**

---

## 2. Stripe billing (organisation-level subscriptions)

**Env:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`

**Dashboard setup**
1. Create a Product + recurring Price → put the price id in `STRIPE_PRICE_ID`.
2. Add a webhook endpoint → `https://<your-domain>/api/stripe/webhook`, sending
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. (Optional) Enable Stripe Tax for AU GST, and activate the Billing Portal in test mode.

**How it works:** `/billing` (admin-only) → `startCheckout` → Stripe Checkout → webhook →
`Organisation.subscriptionStatus` / `stripeCustomerId` updated + an `AuditLog` row +
PostHog events. `Manage billing` opens the Stripe Billing Portal.

**Smoke test**
1. As an ADMIN, open `/billing` → **Subscribe** → complete checkout with a Stripe test card.
2. Confirm the webhook delivered (Stripe dashboard) and `/billing` now shows **Active**.
3. Check an `AuditLog` row (`action = SUBSCRIPTION_UPDATED`) was written.
4. **Manage billing** → cancel → confirm status flips to **Cancelled**.

---

## 3. Observability + transactional email

All optional and independently gated.

| Concern | Env | Notes |
|---|---|---|
| Errors (server+client) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | inert without a DSN |
| Product analytics | `NEXT_PUBLIC_POSTHOG_KEY` (`NEXT_PUBLIC_POSTHOG_HOST`) | client pageviews + server events |
| Email | `RESEND_API_KEY` (`EMAIL_FROM`) | `sendEmail()` no-ops when unset |

**Smoke test**
- **Sentry:** set the DSN, throw a test error in a route, confirm it appears in Sentry.
- **PostHog:** set the key, load a page → see a pageview; run a checkout → see
  `billing_checkout_started`.
- **Resend:** set the key, call `sendEmail(...)` from a server action, confirm delivery.

---

## 4. Shift photos → Supabase Storage

**Env:** `SUPABASE_SERVICE_ROLE_KEY` (already used by auth) + optional `SUPABASE_PHOTOS_BUCKET`
(default `shift-photos`).

**Setup:** create a **PRIVATE** Storage bucket named to match `SUPABASE_PHOTOS_BUCKET`.
(Private — participant photos must never be public; the app serves them via short-lived
signed URLs.)

**How it works:** new photos upload to the bucket and we store **relative paths** (Rule 3);
the shift page resolves paths → signed URLs for display; on edit, a kept photo's signed URL
is mapped back to its path and accepted **only if it's already on that entry**. Without the
bucket, the app falls back to inline data URLs (unchanged dev behaviour). Legacy inline
photos migrate to Storage the first time their entry is edited.

**Smoke test** (needs the bucket)
1. On a live (IN_PROGRESS) shift, add a photo to a log entry → reload → it still renders.
2. Inspect the row: `LogEntry.photos` holds **paths**, not base64.
3. Edit the entry, keeping the existing photo and adding another → save → no loss.
4. Run the DB round-trip test against your Postgres: `npm run test:db`.

---

## Tests & CI

- `npm test` — pure unit tests for the photo round-trip + storage resolution (no DB/keys).
- `npm run test:db` — DB round-trip test; runs inside a transaction that always rolls back
  (leaves no data), skips unless `DATABASE_URL` is Postgres.
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + `npm test` + build on every PR.
