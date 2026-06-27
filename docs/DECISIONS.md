# Caira — locked decisions (2026-06-26)

Edward's answers to the 14 scope questions in `docs/READINESS.md`. These are the
inputs cc + cd build against. **Owner of the follow-up action in bold.**

| # | Decision | Choice | What it unblocks / next action |
|---|---|---|---|
| 1 | Notification channel | **All three** — in-app + email (Resend) + web push | cd: notif center + push permission UX. **cc:** email-send + web-push (service worker, VAPID keys). **You:** VAPID keypair. |
| 2 | eMAR scope | **Lite now → full later** | cc: ship due/given/withheld/refused/PRN. cd: lightweight eMAR UI. Full chart deferred. |
| 3 | Billing / claims | **AU NDIS + live price-guide feed** | cc: import job for the NDIA pricing-arrangements **spreadsheet** (no public API — periodic file import). **You:** confirm which NDIA file/version. |
| 4 | EVV / GPS | **Off for AU trial, US-only later** | Keep region toggle; EVV stays disabled for AU. No trial work. |
| 5 | Assistant embeddings | **You're building it** | Owner = Edward (in progress). cc to integrate when ready; add provider to DPA sub-processor list. |
| 6 | Offline mode | **Build now** (full PWA + sync) | cd: offline UX + sync states. **cc:** service worker, local queue, sync-on-reconnect (idempotency keys already exist). Large client build. |
| 7 | Sectors at launch | **NDIS only** | Lock `sectorConfig` default = NDIS; other sectors stay available but not promoted. |
| 8 | Default participant term | **"Participant"** | `sectorLabels()` default confirmed. |
| 9 | Pricing model | **Multiple: per-worker · per-participant · org tiers** | **You:** set actual price points (post market analysis). cc: Stripe products/prices for each model. cd: segmented pricing on the sales site. |
| 10 | Launch integrations | **All four ON** — Stripe · Sentry · PostHog · Resend | **You:** keys for each. cc: confirm env-gating flips on. PostHog stays behind consent banner. |
| 11 | Domain | **Wire `caira.net.au` now** | **You:** Vercel → Domains → add `caira.net.au` + `www`; add DNS records at registrar; update Supabase Auth Site URL + redirects to `https://caira.net.au`. |
| 12 | Super-admin | **Both** — platform SUPERADMIN (you) + a test ADMIN account | cc: SUPERADMIN override wired ✅ (`rbac.ts`, uncommitted). **You:** run the SUPERADMIN elevation SQL for your account; create a 2nd account + ADMIN SQL for provider-view testing. |
| 13 | Real-data timeline | **Soon (weeks)** | Makes the §F legal gate the **critical path**. Run dummy-data soft launch in parallel. |
| 14 | Legal | **No lawyer yet — need to find one** | **You (critical path):** engage an NDIS-savvy lawyer for privacy policy / provider ToS / DPA / dual-role consent. cc can scope the brief + draft starting points for review. |

---

## Net effect on scope (vs the READINESS defaults)

You chose the **broader** option in several places — this *increases* cd + cc load, which is
fine, just sequencing-relevant:

- **Bigger builds now:** all-three notifications (push = new infra), **offline/PWA** (large),
  all four integrations live, multi-model pricing (several Stripe products).
- **Trimmed:** eMAR lite (not full), EVV off, embeddings owned by you, NDIS-only sectors.
- **Critical path = legal**, because real data is wanted in *weeks*. Everything else (the soft
  launch on dummy data) can proceed without it.

## Immediate next actions
1. **You:** find/engage the NDIS lawyer (gates real participant data).
2. **You:** finish the soft-launch ops — `AUTH_ALLOWLIST`, remove `DEV_AUTH`, Resend SMTP,
   rotate DB password, wire `caira.net.au`, run the SUPERADMIN + test-ADMIN SQL.
3. **cc:** produce the ordered SQL apply script (READINESS §B); commit the `rbac.ts` SUPERADMIN
   wiring (+ tsc/lint/build); scope the legal brief.
4. **cd:** start the critical-path UI — worker-app feature screens, then the `/console`,
   `/portal`, `/platform` surfaces; lock sales-site Direction B.
