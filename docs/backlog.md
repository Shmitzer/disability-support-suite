# Caira — prioritised backlog (from the dashboard feature gaps)

Turns the gap roadmap in `docs/research/care-dashboards-feature-inventory.md` into a
prioritised, ownership-split backlog. Lens: the path to the **NLS / Zef NDIS trial**
(AU, small provider) → broader providers. Priority: **P0** trial-critical · **P1** strong
value soon · **P2** later/scale. Owner: **CC** logic (me) · **cd** UI/design · **Dec**
needs a decision · **Blk** blocked. Nothing here is committed scope — it's the ordered list.

> Note: EVV/GPS is a hard *US* mandate but low value for an *AU* NDIS trial, so it's
> ranked for later despite being "table stakes" in the US survey. Keep region behaviour
> configurable so it can switch on for US.

---

## P0 — for the NLS trial (AU NDIS, small provider)
| # | Item | Why now | Owner | Effort | Depends on |
|---|---|---|---|---|---|
| 1 | **Task / ADL checklist per shift** (plan → tick what was done) | Most-common field feature; proves "support delivered" for NDIS | CC model+logic, cd UI | M | care profile (have) |
| 2 | **Incident register + reportable-incident workflow** (mandatory fields, status, notify) | NDIS Q&S compliance; we only have a single incident entry | CC logic+model, cd UI | M | audit (have) |
| 3 | **Supervisor note approval** (finish the workflow) | Practice-standard sign-off; capability seat exists | CC logic, cd UI | S | RBAC (have) |
| 4 | **Participant record + NDIS plan fields** (plan dates, funding categories, goals) | The trial's core object; today it's thin | CC model+logic, cd UI | M | care profile (have) |
| 5 | **Notifications/alerts** (shift, meds due, incident, approval) | Coordinators rely on it; nothing today | CC logic, cd UI, Dec (channel: email/push) | M | — |

## P1 — strong value, soon after
| # | Item | Why | Owner | Effort | Depends on |
|---|---|---|---|---|---|
| 6 | **Medication management / eMAR** (due / given / witnessed / PRN) | High-value, high-risk; common ask | CC model+logic, cd UI, Dec (scope) | L | — |
| 7 | **Credential / training expiry tracking** | Unblocks **Phase-5 competency gating** (high-intensity chips) | CC model+logic, cd UI | M | care profile high-intensity hook (have) |
| 8 | **Funding / budget tracking vs NDIS plan** | "Is the plan on track?" for coordinators + family | CC logic, cd UI, Dec (price-guide source) | L | participant plan fields (#4) |
| 9 | **Offline mode + sync** | Field workers in low-signal homes | CC logic, cd UI | L | idempotency (have) |
| 10 | **Reporting / analytics + exports** (PDF/CSV, NDIS audit pack) | Switching-cost moat; coordinator KPIs | CC logic, cd UI | M | audit/notes (have) |

## P2 — later / scale / region
| # | Item | Why | Owner | Effort | Depends on |
|---|---|---|---|---|---|
| 11 | **EVV + GPS + signature** | US Medicaid mandate; AU verification nice-to-have | CC logic, cd UI, Dec (region) | M | clock (have) |
| 12 | **Messaging + shift handover** | Team comms; handover view | CC logic, cd UI | M | — |
| 13 | **Multi-payer / claims billing** (NDIS price guide / US payer) | Revenue ops; big + regulated | CC logic, Dec | XL | budget (#8) |
| 14 | **v2 assistant embeddings** (cheap API) | Better recall for Caira | CC logic, Dec (provider) | M | assistant (have) |

---

## Recommended sequence
P0 in order **3 → 1 → 2 → 4 → 5** (approval is small and finishes an existing flow;
then tasks, incidents, the record, notifications). Then P1 starting **7 (credentials →
unblocks competency gating) → 6 (eMAR) → 10 (reporting) → 8 → 9**.

## Done in batches (logic only; cd builds UI)
- ✅ #5 notifications (in-app) · ✅ #6 medication chart/eMAR · ✅ #11 EVV (AU) ·
  ✅ #8/#13 budget+claims · ✅ #10 reporting stats + CSV exports · ✅ #12 messaging + handover.
- Remaining: #9 offline (mostly cd/client), NDIS price-guide feed, embeddings (deferred),
  server TTS (deferred).

## CC logic-only items — STATUS
- ✅ **#3 supervisor approval** — `NoteApprove` cap + supervisorApprove/Reopen actions.
- ✅ **#1 task/ADL checklist** — CareTask + ShiftTaskCompletion; care-task-actions.ts.
- ✅ **#2 incident register** — Incident model; incident-actions.ts (report/review/list).
- ✅ **#7 credentials** — WorkerCredential; credential-actions.ts + credentials.ts; the
  competency gate (`workerMayLogNeed`) now wires the deferred Phase-5 hook.
All logic only (cd builds UI); each adds a `prisma/sql` (unapplied) + pure-tested helpers.
Remaining CC-startable: none in P0 without a decision — next items need the decisions below.

## Needs a decision before building
- #5 notification channel (email via Resend / web push / in-app only).
- #6 eMAR scope (full medication chart vs lightweight due/given/PRN).
- #8/#13 billing source (NDIS price guide feed; US payer rules) — and region toggle.
- #11 EVV — AU now or US-only later.
- #14 embeddings provider (cheap API).
