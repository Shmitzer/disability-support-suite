# Caira — Strategic Review v2 (ARR-at-exit maximized, realistic)

*Written 26 Jun 2026. Financial reassessment of `STRATEGIC_REVIEW.md` under a new goal:
**venture-scale platform, time-to-exit flexible, ARR at exit maximized yet realistic.***

> Planning model, **not financial/legal/valuation advice.** Every figure is an explicit,
> conservative-to-optimistic placeholder to be replaced with real pilot pricing and retention data.
> AU corporate/securities and NDIS-compliance specifics need qualified local counsel and an
> accountant before you raise or sell.

## TLDR
**The ARR-maximizing move is to stop targeting a Year 3–5 exit and target Year 6–8.** ARR is a
*compounding* quantity — the biggest driver of "ARR at exit" isn't the growth rate, it's how many
years you let it compound. A funded, multi-vertical, team-built version of this company realistically
reaches **~$15–30M ARR by Year 6–7** (base case) vs the original ~$1.5–3M at Year 3–5 — roughly a
**10× higher ARR at exit** for ~2–3 more years of compounding. The catch: maximizing *ARR* and
maximizing *your take-home* are not the same thing — every extra year needs more capital and dilutes
you, so the real optimum is where **ARR × multiple, net of your shrinking ownership,** peaks. That's
**Year 6–7**, not "as late as possible." **Recommended target: ~$20M ARR exit around 2032–2033,
EV ~$120–180M, sequenced wedge→expansion→multi-vertical, funded Seed→A→(B).**

---

## Part 1 — Technical soundness (unchanged, condensed)
The architecture supports venture-scale: multi-tenancy, tamper-evident audit, capability-RBAC, and a
disciplined AI seam are the expensive-to-retrofit things, and they're right. No change to the prior
verdict. Must-fix before scale is unchanged: rotate the DB password, wire rate-limit + spend cap, CI
guard on tenant-scoped reads, audited/MFA SUPERADMIN, participant-AI safety harness. None of these cap
ARR; they're operational hygiene. The one financially relevant technical item: **AI inference cost
(Gemini) is your gross-margin risk** — at participant scale it can quietly erode the 80% margin
investors expect. Keep the spend cap and a cheap fallback on the hot path.

## Part 2 — Legal (unchanged conclusion, one financial reframe)
Worker-facing B2B is low-risk to launch; documentation + lawyer booking is the critical path;
social/multiplayer stays dark until a dedicated safeguarding build. The reframe for a
value-maximizing lens: in regulated human services, **compliance depth is not overhead — it's the
moat that justifies a premium multiple and slows competitors.** Every dollar spent on registration
ruling, privacy, DPA, and a child-safe framework *raises* your exit multiple by making you the safe,
certified choice for risk-averse enterprise/government buyers. Budget it as a revenue-and-multiple
investment, not a cost.

---

## Part 3 — The ARR-at-exit model (the re-run)

### The core insight: time is the dominant lever
ARR compounds; exit timing is exponential, not linear. The same well-run company sold at different
years:

| Exit year | Base-case ARR at exit | Why |
|---|---|---|
| Year 3 (original plan) | ~$1.8M | Only the NDIS wedge has landed |
| Year 5 | ~$9M | Community-services expansion underway |
| **Year 6–7 (recommended)** | **~$16–26M** | Multi-vertical compounding hits its stride |
| Year 8–9 | ~$35–50M | Growth decelerating; multiple starts compressing |

Pushing the exit from Year 3 to Year 7 multiplies ARR-at-exit by roughly **10–14×**. That's the
answer to "maximize ARR" — but read the next section before anchoring on Year 8+.

### Why later isn't always better (the trap in "maximize ARR")
Two forces fight as you wait:
- **For waiting:** ARR keeps compounding.
- **Against waiting:** (1) growth *decelerates* (you can't triple forever), and the exit multiple
  compresses with it — a company growing 100% gets 8–10× ARR; one growing 30% gets 4–6×. (2) Each
  extra year typically needs another round, **diluting your ownership** 15–25% each time. (3)
  Market-timing and execution risk accumulate.

So **EV = ARR × multiple** keeps rising past Year 7, but **your personal proceeds** (EV × your
shrinking %) peaks earlier, because dilution and multiple-compression catch up to ARR growth. The
sweet spot where all three balance is **Year 6–7** — the financially honest "maximum," not the
literal ARR peak (which would tell you to never sell).

### The optimized ARR build (base case — funded, 2 founders, multi-vertical)
A credible decelerating curve for a well-run vertical SaaS that successfully expands verticals
(roughly the "T2D3" pattern investors recognize):

| Year | ARR | YoY | Driver |
|---|---|---|---|
| Y1 (2027) | $150k | — | NDIS wedge, first paid logos |
| Y2 (2028) | $600k | 4× | NDIS scale, retention proven |
| Y3 (2029) | $1.8M | 3× | NDIS leadership + first adjacent (aged care) |
| Y4 (2030) | $4.5M | 2.5× | Community-services expansion on same platform |
| Y5 (2031) | $9M | 2× | Multi-vertical, enterprise/multi-org deals |
| **Y6 (2032)** | **$16M** | 1.8× | Health/education entry; NRR >120% |
| **Y7 (2033)** | **$26M** | 1.6× | Multi-vertical platform; export optionality |

What makes this realistic rather than hopium: **growth decelerates every year**
(4×→3×→2.5×→2×→1.8×→1.6×), which is how real SaaS actually grows. Anyone showing a straight 3×/year
for 7 years is lying. The expansion verticals keep the *late* years from collapsing to 1.2× — that's
the entire strategic point of going multi-vertical: **it extends the high-growth window**, which is
exactly what maximizes ARR at exit.

### Re-run scenario table (Year 6–7 exit, conservative inputs)

| Scenario | ARR at exit | Multiple | Indicative EV | P(reaching) |
|---|---|---|---|---|
| **Bear** | $3–5M | 3–4× | ~$10–20M | ~35% |
| **Base** | $16–26M | 5–7× | ~$90–160M | ~45% |
| **Bull** | $40–60M+ | 6–9× | ~$280–500M+ | ~20% |

Compared to the original review's $11.5M weighted exit, **the entire distribution shifts up roughly
an order of magnitude** — driven by (a) the longer compounding window, (b) multi-vertical TAM keeping
growth high in late years, and (c) the team/traction assumptions making the base case actually
reachable rather than a tail.

### What this requires you to maximize ARR realistically
1. **Net Revenue Retention >120%** — expansion within accounts (more seats → more sites → more
   verticals) is the single biggest multiplier on late-year ARR. Build and instrument for
   land-and-expand from day one.
2. **Sequenced vertical entry** — NDIS → community services → health/education, *each on the same
   platform.* Don't enter a new vertical until the prior one is a reference. This keeps the
   deceleration gentle.
3. **Enough capital to not stall** — Year 3→7 compounding requires Seed → Series A → likely Series B.
   Under-funding kills the late-year growth that produces the big ARR. (This is the dilution cost you
   accept in exchange for the 10× ARR.)
4. **Don't sell into the Year 3 trough** — the original plan's Year 3–5 window sells *before* the
   compounding pays off. Patience is the highest-ROI decision here.

---

## Part 4 — Financing implications of the longer horizon
A Year 6–7, $20M+ ARR exit changes the capital plan:

- **Seed (now+~5mo, ~$1M SAFE)** — fund the NDIS wedge + team.
- **Series A (~Y2–3, ~$3–8M)** — fund community-services expansion once NDIS retention is proven.
  The round that buys Year 4–5 growth.
- **Series B (~Y4–5, ~$15–30M)** — fund multi-vertical (health/education) + possibly export.
  Optional — only if growth justifies it.
- **Venture debt** slots alongside A/B once you have $30k+ MRR, to extend runway without extra
  dilution.

**Dilution math to internalize:** across Seed+A+B you'll likely give up 45–60% cumulatively (plus
option pool). On a $120–160M base-case EV, founders' share is realistically **$50–90M split across
the founding team** — still life-changing, and far above the original plan. But this is *why* you
don't wait to Year 9: another round to chase $40M ARR could dilute you faster than EV grows.

---

## Part 5 — Bottom line
**To maximize ARR at exit realistically: change the goal from a Year 3–5 trade sale to a Year 6–7
multi-vertical platform exit, and fund it to compound through the deceleration.** That lifts
realistic base-case ARR-at-exit from ~$2M to **~$16–26M** — roughly 10×, for ~3 more years and 2 more
funding rounds. The verticals aren't just bigger TAM; they're the mechanism that *keeps growth high
in the years that matter for ARR*, which is the whole game. Don't push past Year 7–8 chasing a bigger
ARR number — dilution and multiple-compression mean your *take-home* peaks before the ARR does.

**Recommended target: ~$20M ARR, exit ~2032–2033, EV ~$120–180M base case, sequenced
NDIS → community services → health/education, funded Seed→A→(B).**
