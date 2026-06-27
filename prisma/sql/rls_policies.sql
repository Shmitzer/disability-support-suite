-- rls_policies.sql — Row-Level Security for the multi-tenant schema (Phase E, step 2).
-- Apply AFTER the Postgres cut and AFTER auth_hook.sql:
--     psql "$DIRECT_URL" -f prisma/sql/auth_hook.sql
--     psql "$DIRECT_URL" -f prisma/sql/rls_policies.sql
-- Re-runnable (idempotent).
--
-- OPTION A (app stays on Prisma): the app connects with the privileged Postgres
-- role via DATABASE_URL, which BYPASSES RLS — so these policies do NOT affect the
-- app. They lock the public Data API (PostgREST, reached with the anon/publishable
-- or a user's authenticated key) so a leaked anon key can't read tenants' data.
--
-- HARDENING (Rule 7 / Supabase security checklist):
--   • Policies key off auth.uid() and the org claim from the SIGNED JWT only —
--     never a client-supplied value.
--   • The org claim is injected by the custom-access-token hook (auth_hook.sql)
--     as a top-level `organisationId` claim. We deliberately do NOT read it from
--     `user_metadata`, which is user-editable and therefore spoofable.
--   • auth.uid() is wrapped in (select …) so Postgres caches it per statement.
--
-- PREREQUISITE FOR TENANT READS: rows must carry the owner's auth uid in "userId"
-- (= auth.uid()) and/or their "organisationId". Until the app populates those
-- (see PRODUCTION_CUTOVER.md → E2), the Data API returns NOTHING to clients — a
-- safe deny-by-default. The Prisma app is unaffected throughout.

-- ===========================================================================
-- Data tables: own rows (userId = auth.uid()) OR same org (signed org claim).
-- FOR ALL gives USING (read/update/delete visibility) + WITH CHECK (insert/update
-- target), so an UPDATE can't reassign a row to another tenant.
-- ===========================================================================
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
        "userId" = (select auth.uid())::text
        OR "organisationId" = (auth.jwt() ->> 'organisationId')
      )
      WITH CHECK (
        (
          "userId" = (select auth.uid())::text
          OR "organisationId" = (auth.jwt() ->> 'organisationId')
        )
        -- ...and the row's org, if set, must be YOUR org — so you can't create or
        -- reassign a row into another tenant even on a row you "own" (userId = you).
        AND (
          "organisationId" IS NULL
          OR "organisationId" = (auth.jwt() ->> 'organisationId')
        )
      );
    $f$, t);
  END LOOP;
END $$;

-- ===========================================================================
-- Worker (the spec's User table): see yourself, or members of your organisation.
-- ===========================================================================
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Worker";
CREATE POLICY tenant_isolation ON "Worker"
  FOR ALL TO authenticated
  USING (
    "supabaseUserId" = (select auth.uid())::text
    OR "organisationId" = (auth.jwt() ->> 'organisationId')
  )
  WITH CHECK (
    (
      "supabaseUserId" = (select auth.uid())::text
      OR "organisationId" = (auth.jwt() ->> 'organisationId')
    )
    AND (
      "organisationId" IS NULL
      OR "organisationId" = (auth.jwt() ->> 'organisationId')
    )
  );

-- ===========================================================================
-- Organisation: see only your own org (keyed on the signed org claim).
-- ===========================================================================
ALTER TABLE "Organisation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Organisation";
CREATE POLICY tenant_isolation ON "Organisation"
  FOR ALL TO authenticated
  USING ("id" = (auth.jwt() ->> 'organisationId'))
  WITH CHECK ("id" = (auth.jwt() ->> 'organisationId'));

-- ===========================================================================
-- AuditLog: actorId + organisationId (no userId). Append-only for clients —
-- SELECT + INSERT policies only, no UPDATE/DELETE, so history can't be tampered.
-- ===========================================================================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_read ON "AuditLog";
CREATE POLICY audit_read ON "AuditLog"
  FOR SELECT TO authenticated
  USING (
    "actorId" = (select auth.uid())::text
    OR "organisationId" = (auth.jwt() ->> 'organisationId')
  );
DROP POLICY IF EXISTS audit_insert ON "AuditLog";
CREATE POLICY audit_insert ON "AuditLog"
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      "actorId" = (select auth.uid())::text
      OR "organisationId" = (auth.jwt() ->> 'organisationId')
    )
    AND (
      "organisationId" IS NULL
      OR "organisationId" = (auth.jwt() ->> 'organisationId')
    )
  );

-- ===========================================================================
-- _prisma_migrations: Prisma's own bookkeeping table lives in `public`, so the
-- Table Editor flags it UNRESTRICTED. Enable RLS with NO policy → no anon/
-- authenticated access at all. The privileged Prisma role and service_role still
-- reach it (they bypass RLS), so migrations keep working. Do NOT use FORCE RLS,
-- which would also subject the owner and break `prisma migrate`.
--
-- GUARDED: this table only exists when the schema was applied with `prisma migrate`.
-- Under `prisma db push` it isn't created, so skip it instead of erroring — an error
-- here would roll back this whole script and leave RLS OFF on every table.
-- ===========================================================================
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- NOTE: Supabase's service-role key bypasses RLS. Deliberate cross-tenant server
-- work uses the service role; anything reachable from the browser uses the anon/
-- authenticated key so these policies apply. The Prisma app uses DATABASE_URL and
-- is unaffected by all of the above.

-- ===========================================================================
-- WaitlistSignup: pre-launch email capture, written only by the Prisma app. It
-- holds raw email addresses and is NOT tenant-scoped, so there is no policy to
-- write — enable RLS with NO policy → no anon/authenticated (Data API) access at
-- all. The privileged Prisma role and service_role bypass RLS, so the landing
-- page's server action keeps inserting. (Same pattern as _prisma_migrations.)
-- ===========================================================================
ALTER TABLE "WaitlistSignup" ENABLE ROW LEVEL SECURITY;
