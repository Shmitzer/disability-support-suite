# RLS hardening plan — new tables (stacked on PR #3)

Extend Row-Level Security to every table added on the feature branch, consistent with
the existing `prisma/sql/rls_policies.sql` (org-claim + owner pattern). RLS is applied
by hand at cutover (order-sensitive; see `docs/PRODUCTION_CUTOVER.md`). This branch adds
the policies + verification; it does **not** change app code.

**STATUS: DELIVERED.** Decisions resolved (see below); `prisma/sql/rls_policies_v2.sql`
written, `verify_rls.sql` extended (checks 7–8), and verification run against a local
Postgres with the Supabase shims — **all 8 RLS checks pass**.

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

## Decisions (resolved)
1. **Enforcement model** → **Option A** (privileged app role via `DATABASE_URL`
   bypasses RLS; RLS = tenant-isolation defence-in-depth for the Supabase Data API).
2. **Participant-scoped rows** → **org-only policies** (the app enforces fine-grained
   participant/grant access in code via `canAccessParticipant`; RLS stays org-scoped).
3. **Solo / null-org rows** → **owner-fallback** (`userId = auth.uid()` OR org claim)
   on the tables that have a `userId` (AssistantContext/Message, Document, Notification).
4. **Verification** → **extend `verify_rls.sql` + run** (checks 7–8 added).

## Deliverables (DONE)
- ✅ `prisma/sql/rls_policies_v2.sql` — ENABLE RLS + `tenant_isolation` on all 19 new
  tables: 15 org-only + 4 owner-fallback. Idempotent (same DO-loop pattern as v1).
- ✅ `verify_rls.sql` — check 7 (org-only Incident isolates tenants) + check 8
  (owner-fallback Notification: own org + own solo row, no cross-tenant leak). Existing
  check 6 (every `public` table has RLS) already guards the rest. Verified: ALL PASS.
- ✅ `PRODUCTION_CUTOVER.md` — apply-order row #7 (run LAST, after v1 + per-feature files).
