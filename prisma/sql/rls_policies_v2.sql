-- rls_policies_v2.sql — Row-Level Security for the tables added on the feature
-- branch (PR #3 / PR #4). Stacks on prisma/sql/rls_policies.sql; same Option-A
-- posture. Apply AFTER rls_policies.sql at cutover:
--     psql "$DIRECT_URL" -f prisma/sql/auth_hook.sql
--     psql "$DIRECT_URL" -f prisma/sql/rls_policies.sql
--     psql "$DIRECT_URL" -f prisma/sql/rls_policies_v2.sql
-- Re-runnable (idempotent).
--
-- OPTION A (decided): the Prisma app connects via the privileged DATABASE_URL
-- role, which BYPASSES RLS. These policies are tenant-isolation DEFENCE-IN-DEPTH
-- for the Supabase Data API (PostgREST reached with the anon/publishable or a
-- user's authenticated key) — a leaked anon key still can't read another tenant.
-- Fine-grained, participant/grant-level access stays enforced in app code
-- (canAccessParticipant, grants); the policies here are intentionally ORG-SCOPED
-- only, not grant-aware (decision: "org-scoped only").
--
-- HARDENING (same as rls_policies.sql): policies key off the SIGNED JWT only —
-- auth.uid() (wrapped in (select …) for per-statement caching) and the top-level
-- `organisationId` claim injected by auth_hook.sql. Never user_metadata.
--
-- SCOPING MODEL:
--   • ORG-ONLY tables (no userId column): visible/writable when "organisationId"
--     = the signed org claim. Rows with a NULL organisationId are not reachable
--     from the Data API (safe deny-by-default); the Prisma app reaches them via
--     the privileged role.
--   • OWNER-FALLBACK tables (have userId): "userId" = auth.uid() OR same org —
--     so solo / no-org rows still work for their owner (decision: "owner-fallback").

-- ===========================================================================
-- ORG-ONLY tables: scope purely by the signed org claim. FOR ALL gives USING
-- (read/update/delete) + WITH CHECK (insert/update target) so a row can't be
-- created in, or reassigned to, another tenant.
-- ===========================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Membership','ParticipantAccessGrant','Consent','ParticipantCareProfile',
    'CareTask','ShiftTaskCompletion','Incident','WorkerCredential','Medication',
    'MedicationAdministration','VisitVerification','ParticipantBudget',
    'BillableItem','Message','ShiftHandover'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO authenticated
      USING (
        "organisationId" = (auth.jwt() ->> 'organisationId')
      )
      WITH CHECK (
        "organisationId" = (auth.jwt() ->> 'organisationId')
      );
    $f$, t);
  END LOOP;
END $$;

-- ===========================================================================
-- OWNER-FALLBACK tables: own rows (userId = auth.uid()) OR same org. The
-- WITH CHECK also forbids reassigning a row into another tenant even on a row
-- you "own" — identical to the data-table pattern in rls_policies.sql.
-- ===========================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'AssistantContext','AssistantMessage','Document','Notification'
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
        AND (
          "organisationId" IS NULL
          OR "organisationId" = (auth.jwt() ->> 'organisationId')
        )
      );
    $f$, t);
  END LOOP;
END $$;

-- NOTE: service_role and the privileged Prisma role bypass RLS; deliberate
-- cross-tenant server work uses them. Anything reachable from the browser uses
-- the anon/authenticated key, so these policies apply.
