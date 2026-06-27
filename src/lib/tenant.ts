// tenant.ts — multi-tenant helpers. The app connects to Postgres via Prisma with a
// privileged role that BYPASSES RLS (Option A), so RLS protects only the Data API —
// the APP must scope its own reads/writes by tenant. Two helpers do that:
//
//   tenantOwner(worker)  → STAMP on writes  (data: { …, ...tenantOwner(worker) })
//   tenantScope(worker)  → FILTER on reads  (where: { …, ...tenantScope(worker) })
//
//   userId         = the owner's Supabase auth UID (what RLS compares to auth.uid()).
//                    Falls back to the Worker id for dev/seed rows created before real
//                    auth exists (keeps the column non-null).
//   organisationId = the owner's org (null for solo workers).

export type TenantActor = {
  id: string;
  supabaseUserId: string | null;
  organisationId: string | null;
};

// Stamp written onto every owned row so it carries its tenant.
export function tenantOwner(worker: TenantActor) {
  return {
    userId: worker.supabaseUserId ?? worker.id,
    organisationId: worker.organisationId,
  };
}

// Where-fragment that scopes a READ to the caller's tenant: org members see their
// whole org; a solo worker (no org) sees only their own rows. Mirrors tenantOwner.
//
// Use findFirst (not findUnique) when adding this to an id lookup — the where-clause
// is no longer a single unique field:
//   findFirst({ where: { id, ...tenantScope(worker) } })   // ownership-checked fetch
//   findMany({  where: { ...tenantScope(worker) } })        // tenant-filtered list
export function tenantScope(worker: TenantActor) {
  return worker.organisationId
    ? { organisationId: worker.organisationId }
    : { userId: worker.supabaseUserId ?? worker.id };
}
