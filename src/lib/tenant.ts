// tenant.ts — the ownership stamp written onto every owned row so Row-Level
// Security can scope it (Phase E, step 2).
//
//   userId         = the owner's Supabase auth UID, which is what the RLS
//                    policies compare against auth.uid(). Falls back to the
//                    Worker id for dev/seed rows created before real auth exists
//                    (keeps the column non-null; those rows are only ever read
//                    through Prisma, which bypasses RLS).
//   organisationId = the owner's org (null for solo workers).
//
// Spread it into a Prisma `create`:  data: { …, ...tenantOwner(worker) }

type Owner = {
  id: string;
  supabaseUserId: string | null;
  organisationId: string | null;
};

export function tenantOwner(worker: Owner) {
  return {
    userId: worker.supabaseUserId ?? worker.id,
    organisationId: worker.organisationId,
  };
}
