-- rls_policies.sql — Row-Level Security for the multi-tenant schema (Phase E).
-- Applied in the Supabase SQL editor (or via migration) AFTER the Postgres cut.
-- Hardened pattern (Rule 7): policies read the tenant from the SIGNED JWT, never
-- from a client-supplied value — preventing BOLA/IDOR. Re-runnable (idempotent).
--
-- PREREQUISITES:
--   1. Each data row's "userId" holds the owner's Supabase auth UID (auth.uid()),
--      and/or "organisationId" holds their org id.
--   2. A Supabase Auth hook injects organisationId into the JWT at login, so
--      auth.jwt() -> 'user_metadata' ->> 'organisationId' resolves per request.
--      (See PRODUCTION_CUTOVER.md → "JWT org claim".)

-- ---------------------------------------------------------------------------
-- Tenant isolation on every data table that carries userId + organisationId.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Participant','WorkerParticipant','ProgressNote','Shift','ShiftEvent',
    'LogEntry','ShiftReport','LearnedOption','ClockAmendmentRequest'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO authenticated
      USING (
        "userId" = auth.uid()::text
        OR "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
      )
      WITH CHECK (
        "userId" = auth.uid()::text
        OR "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
      );
    $f$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Worker (the User table): see yourself, or members of your organisation.
-- ---------------------------------------------------------------------------
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Worker";
CREATE POLICY tenant_isolation ON "Worker"
  FOR ALL TO authenticated
  USING (
    "supabaseUserId" = auth.uid()::text
    OR "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
  )
  WITH CHECK (
    "supabaseUserId" = auth.uid()::text
    OR "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
  );

-- ---------------------------------------------------------------------------
-- Organisation: see only your own org.
-- ---------------------------------------------------------------------------
ALTER TABLE "Organisation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Organisation";
CREATE POLICY tenant_isolation ON "Organisation"
  FOR ALL TO authenticated
  USING ("id" = (auth.jwt() -> 'user_metadata' ->> 'organisationId'))
  WITH CHECK ("id" = (auth.jwt() -> 'user_metadata' ->> 'organisationId'));

-- ---------------------------------------------------------------------------
-- AuditLog: org-scoped (it has actorId + organisationId, no userId). Append-only
-- for clients — no UPDATE/DELETE policy, so authenticated users can read/insert
-- within their org but never tamper with history.
-- ---------------------------------------------------------------------------
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_read ON "AuditLog";
CREATE POLICY audit_read ON "AuditLog"
  FOR SELECT TO authenticated
  USING (
    "actorId" = auth.uid()::text
    OR "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
  );
DROP POLICY IF EXISTS audit_insert ON "AuditLog";
CREATE POLICY audit_insert ON "AuditLog"
  FOR INSERT TO authenticated
  WITH CHECK (
    "organisationId" = (auth.jwt() -> 'user_metadata' ->> 'organisationId')
  );

-- NOTE: Supabase's service-role key bypasses RLS. Server-side mutations that must
-- write across tenants (e.g. system jobs) use the service role deliberately;
-- everything reachable from the browser uses the anon/authenticated key so these
-- policies apply.
