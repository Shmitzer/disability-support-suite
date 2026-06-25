# RLS hardening plan — new tables (stacked on PR #3)

Extend Row-Level Security to every table added on the feature branch, consistent with
the existing `prisma/sql/rls_policies.sql` (org-claim + owner pattern). RLS is applied
by hand at cutover (order-sensitive; see `docs/PRODUCTION_CUTOVER.md`). This branch adds
the policies + verification; it does **not** change app code.

Pending the decisions below — this plan is the proposal.

## Pattern (existing)
- Enable RLS on every `public` table.
- Authenticated users: a row is visible/writable when its `organisationId` = the JWT
  org claim (`auth.jwt() ->> 'organisationId'`) and/or `userId` = `auth.uid()`.
- The Prisma app connects via the privileged `DATABASE_URL` role and **bypasses RLS**
  (Option A) — so RLS is tenant-isolation **defence-in-depth** for the Supabase Data
  API, while the app enforces fine-grained access in code (`canAccessParticipant`, grants).

## Tables to cover (added this branch) → proposed scope
| Table | Scope column(s) | Policy |
|---|---|---|
| Membership | organisationId | org claim |
| ParticipantAccessGrant | organisationId | org claim |
| Consent | organisationId | org claim |
| ParticipantCareProfile | organisationId | org claim |
| AssistantContext | userId (+org) | owner `auth.uid()` OR org claim |
| AssistantMessage | userId (+org) | owner OR org |
| Document | userId (+org) | owner OR org |
| CareTask | organisationId | org claim |
| ShiftTaskCompletion | organisationId | org claim |
| Incident | organisationId | org claim |
| WorkerCredential | organisationId | org claim (own via workerId optional) |
| Notification | userId (+org) | owner `auth.uid()` |
| Medication | organisationId | org claim |
| MedicationAdministration | organisationId | org claim |
| VisitVerification | organisationId | org claim |
| ParticipantBudget | organisationId | org claim |
| BillableItem | organisationId | org claim |
| Message | organisationId | org claim |
| ShiftHandover | organisationId | org claim |

Notes:
- Several new tables have **no `userId`** (Incident, Medication, budgets, …) — they scope
  by `organisationId` only (the app handles participant/grant-level access). Owner-scoped
  tables (Notification, AssistantContext/Message, Document) also allow `userId = auth.uid()`
  so solo/no-org rows still work.
- `_prisma_migrations`, service-role grants, and the deny-by-default for `anon` are
  already handled in the existing file — this extends, doesn't replace.

## Decisions (asked up front, before implementing)
1. **Enforcement model** — keep Option A (privileged app role; RLS = Data-API defence)
   vs move to Option B (app runs as authenticated role; RLS enforces every query).
2. **Participant-scoped rows** — org-only policies (simpler) vs grant-aware policies
   (RLS joins `ParticipantAccessGrant` so family/guardian only see their participant).
3. **Solo / null-org rows** — owner-only via `userId = auth.uid()` when `organisationId`
   is null, vs require an org always.
4. **Verification** — extend `verify_rls.sql` + `npm run verify:rls` with cross-tenant
   checks for the new tables, vs skip automated verification this batch.

## Deliverables (the batch, after decisions)
- `prisma/sql/rls_policies_v2.sql` (or extend the existing file) — ENABLE RLS + policies
  for all tables above, per the chosen model.
- (if chosen) `verify_rls.sql` additions + a short test asserting cross-tenant denial.
- Doc note in `PRODUCTION_CUTOVER.md` apply-order.
