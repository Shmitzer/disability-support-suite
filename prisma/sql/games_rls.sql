-- games_rls.sql — Row-Level Security for the Game Suite (System A) tables.
-- Stacks on rls_policies.sql / rls_policies_v2.sql; same Option-A posture.
-- Apply AFTER games.sql:
--     psql "$DIRECT_URL" -f prisma/sql/games.sql
--     psql "$DIRECT_URL" -f prisma/sql/games_rls.sql
-- Re-runnable (idempotent).
--
-- OPTION A: the Prisma app connects via the privileged role and BYPASSES RLS.
-- These policies are defence-in-depth for the Supabase Data API only — a leaked
-- anon/authenticated key still can't read another tenant. Org-scoped, keyed off
-- the SIGNED JWT (auth.uid() + the top-level organisationId claim from
-- auth_hook.sql) — never user_metadata. Mirrors rls_policies_v2.sql exactly.

-- ── OWNER-FALLBACK tables (have userId): own rows OR same org ──────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'NDISGoal','GameSession','ParticipantXP'
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

-- ── ORG-ONLY tables (no userId): scope purely by the signed org claim ─────────
-- GoalProgress / GoalGameLink carry organisationId but no userId. Rows with a
-- NULL organisationId are not reachable from the Data API (deny-by-default); the
-- Prisma app reaches them via the privileged role.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'GoalProgress','GoalGameLink'
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
