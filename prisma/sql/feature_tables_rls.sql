-- feature_tables_rls.sql — post-apply RLS sweep for the Phase-0 feature tables.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Apply by hand AFTER the feature DDL:
--       psql "$DIRECT_URL" -f prisma/sql/feature_tables_rls.sql
--     (apply_all_features.sql already includes it as the final step). Re-runnable.
--
-- Why: the feature DDL files (care_tasks/credentials/incidents/
-- notifications_med_evv_billing/messaging/documents) create tenant tables but do
-- NOT enable RLS. Under Option A the app reaches Postgres via the privileged Prisma
-- role and BYPASSES RLS, so these policies don't touch the app — they lock the
-- public Data API (PostgREST via the anon/authenticated key) so a leaked anon key
-- can't read one tenant's care tasks, meds, incidents, messages, etc.
--
-- Deny-by-default + tenant isolation, matching rls_policies.sql / _v2.sql. The
-- predicate is built PER TABLE from whichever of "userId" / "organisationId" the
-- table actually has (these tables vary: most carry only "organisationId"; a few
-- also carry "userId"). assistant.sql, participant_care_profile.sql and
-- rbac_grants.sql ship their own RLS, so they are intentionally NOT swept here.

BEGIN;

DO $$
DECLARE
  t           text;
  has_user    boolean;
  has_org     boolean;
  predicate   text;
  reassign    text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- care_tasks.sql
    'CareTask','ShiftTaskCompletion',
    -- credentials.sql
    'WorkerCredential',
    -- incidents.sql
    'Incident',
    -- notifications_med_evv_billing.sql
    'Notification','Medication','MedicationAdministration',
    'VisitVerification','ParticipantBudget','BillableItem',
    -- messaging.sql
    'Message','ShiftHandover',
    -- rbac_grants.sql + participant_care_profile.sql ship their tenant_isolation
    -- only as COMMENTED-OUT SQL, so RLS is actually off on these — sweep them too.
    'Membership','ParticipantAccessGrant','Consent','ParticipantCareProfile'
    -- NOTE: Document, Notification, AssistantContext and AssistantMessage are
    -- already covered by rls_policies_v2.sql; LearnedOption by its own file.
  ] LOOP
    -- The table may not exist if its DDL file wasn't applied; skip rather than fail.
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'feature_tables_rls: skipping % (not present)', t;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'userId'
    ) INTO has_user;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisationId'
    ) INTO has_org;

    -- Build the isolation predicate from the columns the table actually has.
    -- own row (userId = auth.uid()) OR same org (signed org claim).
    predicate := '';
    IF has_user THEN
      predicate := '"userId" = (select auth.uid())::text';
    END IF;
    IF has_org THEN
      IF predicate <> '' THEN predicate := predicate || ' OR '; END IF;
      predicate := predicate || '"organisationId" = (auth.jwt() ->> ''organisationId'')';
    END IF;

    -- No tenant column at all → deny-by-default (enable RLS, no permissive policy).
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    IF predicate = '' THEN
      RAISE NOTICE 'feature_tables_rls: % has no userId/organisationId — deny-by-default', t;
      CONTINUE;
    END IF;

    -- WITH CHECK also forbids planting/reassigning a row into another tenant, even
    -- on a row you "own" — identical guard to rls_policies.sql. The reassign guard
    -- only applies when the table actually has an "organisationId" column.
    reassign := '';
    IF has_org THEN
      reassign := ' AND ("organisationId" IS NULL'
        || ' OR "organisationId" = (auth.jwt() ->> ''organisationId''))';
    END IF;

    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO authenticated
      USING ( %s )
      WITH CHECK ( ( %s )%s );
    $f$, t, predicate, predicate, reassign);
  END LOOP;
END $$;

COMMIT;
