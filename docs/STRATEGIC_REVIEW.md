# Caira — Strategic Review: technical soundness, legal, exit model

Written 26 Jun 2026. **Assumes the overnight build (`OVERNIGHT_BUILD.md`) completed successfully** —
i.e. the unapplied SQL is applied, feature UIs are built + wired, the character/game Steps 1–5 are
in, and 6–7 exist behind flags. Treat the verdicts as conditional on that and on a green
`tsc/lint/build/test` run.

> Caveats: this is an engineering + strategy assessment, **not legal or financial advice.** The
> legal section flags risk areas for a qualified NDIS/privacy lawyer; the exit section is an
> illustrative scenario model with explicit assumptions, not a valuation or investment advice.

---

## Part 1 — Technical soundness

### What's genuinely strong
- **Multi-tenancy from the schema up** — `organisationId` on every data table (Rule 5/10), not bolted on later. This is the single hardest thing to retrofit, and it's right.
- **Defence in depth on isolation** — Postgres **RLS (Option A)** + an **app-layer `tenantScope`** because Prisma bypasses RLS. Both halves exist; cross-tenant checks pass `verify_rls_editor.sql`.
- **Capability-based RBAC** — gates ask `can(role, Capability.X)` against one policy map, so the enterprise 32-role model slots in by editing data, not re-plumbing auth. `SUPERADMIN` now wired through.
- **Tamper-evident audit** — per-org SHA-256 hash chain; any edit/delete breaks it; `verifyAuditChain()` detects the first break. Strong NDIS-compliance posture.
- **Disciplined seams** — all AI behind `src/lib/ai.ts`; PII scrub before any external call; idempotency keys on mutations; output validation/fallback; relative storage paths. The "12 rules" are real and enforced.
- **Tested + CI** — pure helpers unit-tested (80+), headless `build` green, GitHub Actions.

### Risks / what to harden before real users
1. **The RLS bypass is load-bearing.** Because the app reads via Prisma (bypassing RLS), tenant safety depends on `tenantScope` being applied **everywhere**. One unscoped query = an IDOR. Add a lint/test guard that fails CI on an unscoped tenant-table read.
2. **Many SQL files are apply-by-hand.** ~13 feature tables ship as `prisma/sql/*.sql`, not auto-applied. Wrong order or a missed file = silently-inert features. The ordered apply script (READINESS §B) must be the single source; verify with a post-apply RLS sweep.
3. **Secrets hygiene.** The exposed DB password **must be rotated** before go-live (it has recurred on the list). Move all secrets to Vercel/Supabase managed env; never in the repo.
4. **AI cost + abuse ceiling.** Rate-limit is scaffolded but **inert without Upstash keys**, and the hard spend cap is provider-side only. A runaway loop or abuse could rack Gemini cost. Wire the limiter + a budget alarm before opening signups.
5. **`SUPERADMIN` is now god-mode.** Powerful and correct for you, but every SUPERADMIN action must be audited, the account MFA-protected, and it should never be the default login. Treat it like root.
6. **The new participant-facing AI is a different risk class.** A Gemini persona talking to vulnerable adults (and possibly minors) needs hard safety guardrails, refusal patterns, distress flagging, and no capacity to give harmful/medical/financial advice. This is the highest-stakes *technical* surface in the expansion.
7. **Offline/PWA sync conflicts.** Idempotency keys help, but offline → reconnect needs deterministic conflict resolution and clear "pending/synced" states, or workers will distrust it.
8. **Scale watch-items (not blockers now):** polling-based multiplayer won't scale past small rooms (WebSocket upgrade path is noted — good); image/audio in Storage needs lifecycle rules; Gemini latency on the capture path needs a fast fallback.

### Technical verdict
The **core architecture is sound and unusually well-disciplined for a solo, AI-directed build** — the things that are expensive to fix later (tenancy, audit, auth model, AI seam) are right. The risks are operational (apply the SQL correctly, rotate the password, wire the limiter, guard the RLS bypass) and additive (the participant AI/game/social layer is new surface area). None are architectural dead-ends. **Must-fix before the first real participant:** rotate DB password · wire rate-limit + spend cap · CI guard on tenant-scoped reads · audited+MFA SUPERADMIN · participant-AI safety harness.

---

## Part 2 — Legal & compliance

The B2B worker tool and the participant social/play layer are **two very different risk profiles.**
Keep them decoupled (the design already does — keep it that way).

### Core platform (already identified in your lawyer brief — confirm these)
- **NDIS platform classification / registration.** Is Caira an "NDIS digital platform service" (registration group 0137) or back-end SaaS? Drives registration, notification, and change-of-ownership audit obligations. *Get a definitive ruling — it shapes ToS and marketing.*
- **Privacy Act 1988 / APP 8 cross-border.** Care notes sent to Gemini: does localized pre-API scrubbing make them "de-identified," or do they stay "sensitive health information" (high re-identification risk in care contexts)? If the latter, cross-border disclosure to overseas LLMs triggers APP 8 → contractual clauses + DPA needed.
- **De-identification adequacy** — the residual re-id risk is the crux; design assuming it remains personal information until counsel says otherwise.
- **DPA + sub-processor list** (Supabase/AWS Sydney, Gemini, Resend, Vercel, Stripe, PostHog, Sentry), **7-year retention**, **OAIC NDB breach plan**, **dual-role consent** (worker-vs-family access for one person).
- **Civil penalty exposure** is real (the brief cites up to ~$15M where participant harm occurs) — compliance is a commercial priority, not box-ticking.

### New scope materially raises legal stakes (the participant layer)
- **Participant-to-participant social connections** — vulnerable adults (and minors): safeguarding, grooming/abuse risk, **mandatory reporting**, eSafety obligations, guardian consent. *Correctly gated `SOCIAL_CONNECTIONS_ENABLED=false` until legal review — keep it off.*
- **Multiplayer games between participants** — same safeguarding surface; keep `MULTIPLAYER_GAMES_ENABLED=false`.
- **Children.** NDIS includes minors → **Child Safe Standards**, age-appropriate design code, Working-With-Children considerations for anyone with access, parental/guardian consent. If under-18s ever use the participant app, this is a whole compliance workstream.
- **Therapeutic claims.** Games "support/practise" skills — **never market them as treating/curing** anything (TGA/ACCC misleading-conduct risk). Whether game sessions can count toward NDIS-funded "capacity building" is a funding question for counsel.
- **Real-world rewards fulfilled by workers** — financial controls + safeguarding (no coercion, clear audit) so a reward system can't be abused.
- **Gamifying vulnerable users** — ethical design duty: no dark patterns, no addictive loops, dignity-first.

### Legal verdict
The **worker-facing B2B SaaS on dummy data is low-risk to soft-launch**; the gate is the documentation set (privacy policy, ToS, DPA, dual-role consent) before *real* data — **and your timeline is weeks, with no lawyer engaged yet. That booking is the critical path.** The **participant social/multiplayer/AI layer is a different, higher order of risk** (safeguarding, child safety, mandatory reporting) and is correctly flag-gated; do **not** enable it for real participants without dedicated legal sign-off and a safeguarding + Child-Safe framework. Strategic implication: **the character + therapeutic-games layer can ship as differentiation; social + multiplayer should stay dark until they're worth a dedicated compliance build.**

---

## Part 3 — Exit model (re-run with the new features)

*Illustrative scenario model. Assumptions are explicit and conservative-to-optimistic; not a valuation.*

### Baseline (prior)
Trade sale Year 3–5, probability-weighted ≈ **$11.5M**. MRR milestones: $500 (proof/hosting) → $1.5k (drop a shift/week) → $3.5k (full independence) → $8k (before first hire) → $15k (small team).

### How the new layer moves the model
**Raises the ceiling:**
- **Differentiation / moat** — "Caira the character" is a brand and an emotional switching cost; compliance software that feels like care is rare. Higher retention → higher multiple.
- **TAM expansion** — from a worker tool to a **whole-of-participant platform** (worker + supervisor + participant + family). More seats, more stickiness, a second revenue surface.
- **Capacity-building angle** — therapeutic games + goal tracking open an NDIS-funded participant-side value story (subject to the funding/legal question above).
- **Multi-sided engagement** — platforms with daily participant engagement command richer multiples than back-office SaaS alone.

**Raises the variance / risk:**
- **Safeguarding liability is existential** — one serious harm incident involving a vulnerable participant (via social/AI) is reputational + regulatory + civil-penalty catastrophic. This is the single biggest value-at-risk in the expansion.
- **Regulatory drag** — NDIS registration + privacy + child-safety slow enterprise sales and add cost.
- **Focus risk** — a solo, AI-directed founder splitting between a B2B SaaS and a consumer-grade engagement/game platform. Scope creep can sink revenue timing.
- **Cost + time** — AI inference at participant scale, plus a much larger build, push revenue out.

### Scenarios (illustrative)

| Scenario | Path | Rough ARR at exit | Multiple | Indicative EV | P(reaching) |
|---|---|---|---|---|---|
| **Bear** | Worker SaaS only; slow NDIS sales; never lights up the participant layer | $0.3–0.6M | 2–3× | ~$1–2M (or acqui-hire/wind-down) | ~35% |
| **Base** | Worker SaaS to real revenue + character/therapeutic games shipped; social/MP stay gated | $1.5–3M | 4–6× | ~$8–15M | ~45% |
| **Bull** | Full platform, participant engagement live + compliant, multi-org enterprise traction | $5–10M+ | 6–10× | ~$40–80M+ | ~20% |

Probability-weighted, this **widens the distribution**: a higher bull ceiling than the prior $11.5M, a meaningful bear tail, and a base case broadly consistent with (slightly above) the prior number once the character/therapeutic layer lands. The headline isn't "the number went up" — it's "**the ceiling went up and so did the variance.**"

### What most moves the expected value
1. **Get to real B2B revenue first** (de-risks everything; proves retention; funds the rest).
2. **Ship character + therapeutic games** as the differentiator — *low legal risk, high brand/retention upside.*
3. **Keep social/multiplayer dark** until a dedicated safeguarding + legal build — it's the biggest tail risk and the least proven revenue.
4. **Nail the compliance core** (registration ruling, privacy, DPA) — it's a sales-unlock and a liability-shield, not overhead.

### Exit verdict
The new features are **accretive to the ceiling and to the moat, but only if sequenced to keep the safeguarding tail closed.** Recommended order preserves the higher-ceiling optionality while protecting the downside: **B2B revenue → character + therapeutic games → compliance depth → (only then, deliberately) social/multiplayer.**

---

## Part 4 — Additional features worth considering (core app)

Beyond the 100-game suite (`GAME_SUITE_100.md`), high-leverage core-product additions:
- **Auto-generated NDIS report/PDF export pack** (progress reports, audit pack) — a switching-cost moat and a direct time-saver.
- **NDIS plan budget burn-down dashboards** for coordinators + family ("is the plan on track?").
- **Plan-manager / claims path** — PRODA-PACE claim export, invoicing (big, regulated; tie to the price-guide importer).
- **SCHADS award interpretation** for worker pay/penalty rates — sticky for providers.
- **Shift-offer marketplace** + rostering optimisation (the auction model already exists).
- **Family/guardian portal** (read-only care feed + consent) — the participant-side wedge.
- **PWA / mobile-first offline** (already decided) + **voice-first capture** as the headline worker feature.
- **Compliance auto-reminders** — credential/WWCC/first-aid expiry, plan-review dates, restrictive-practice review.
- **Wellbeing/sentiment trends** from notes (de-identified) — early-warning for coordinators.
- **Integrations** — Xero/payroll, calendar, SSO for enterprise.
- **White-label / enterprise multi-org tier** — the path to the bull case.
- **AI report-quality scoring** + multilingual capture (CALD workforce).

---

## Part 5 — Bottom line

The engineering is **sound and well-sequenced**; the core legal gate is **documentation + a lawyer
booking that's now the critical path**; the new character/game/social vision **raises both the
ceiling and the risk**. The single highest-EV plan: **ship the B2B worker SaaS to real revenue,
layer the Caira character + therapeutic games as the moat, deepen compliance, and keep social +
multiplayer behind their flags until they earn a dedicated safeguarding build.** Do that, and the
expansion is upside with the tail risk contained.
