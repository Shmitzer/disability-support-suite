-- verify_rls_editor.sql — cross-tenant (BOLA) RLS check for the Supabase SQL EDITOR
-- (Windows / no psql). Same assertions as verify_rls.sql, but as a SINGLE self-
-- contained, self-cleaning DO block: no psql meta-commands, and it removes its own
-- fixtures at the end (and on failure), so nothing is left behind.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste ALL of this → Run.
-- It injects request.jwt.claims to simulate two orgs' users + an anon caller.
-- Success → a "ALL RLS CHECKS PASSED" notice. Failure → a red error naming the check.
-- Run it AFTER auth_hook.sql + rls_policies.sql are applied.

DO $$
DECLARE
  owner_role text := current_user;   -- 'postgres' in the SQL editor; we restore to it
  total int; leaked int; affected int; blocked boolean; bad text := '';
  r record;
BEGIN
  -- ---- Fixtures (as owner → RLS bypassed). The org-scoped rows are owned by a
  --      DIFFERENT user, so visibility there can only come from the org claim. ----
  INSERT INTO "Organisation"(id, name) VALUES
    ('verify_orgA','Verify Org A'), ('verify_orgB','Verify Org B');
  INSERT INTO "Participant"(id, name, "userId", "organisationId") VALUES
    ('verify_pA',   'Alice (org A)',    'ffffffff-0000-0000-0000-0000000000a9','verify_orgA'),
    ('verify_pB',   'Bob (org B)',      'ffffffff-0000-0000-0000-0000000000b9','verify_orgB'),
    ('verify_pSolo','Solo (owner = A)', '00000000-0000-0000-0000-0000000000a1', NULL);

  -- ---- 1. Org A member: sees org A row + own solo row (2); NOT org B's ----
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);
  SELECT count(*) INTO total  FROM "Participant" WHERE id LIKE 'verify_%';
  SELECT count(*) INTO leaked FROM "Participant" WHERE id = 'verify_pB';
  IF leaked <> 0 THEN RAISE EXCEPTION 'FAIL 1: org A member can read org B (cross-tenant leak)'; END IF;
  IF total <> 2 THEN RAISE EXCEPTION 'FAIL 1: org A should see 2 rows, saw % (if 0, the authenticated role lacks SELECT on Participant)', total; END IF;
  RAISE NOTICE 'PASS 1: org A member sees own org only';

  -- ---- 2. Org B member: sees only org B's row (1) ----
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000b1","organisationId":"verify_orgB"}', true);
  SELECT count(*) INTO total  FROM "Participant" WHERE id LIKE 'verify_%';
  SELECT count(*) INTO leaked FROM "Participant" WHERE id IN ('verify_pA','verify_pSolo');
  IF leaked <> 0 THEN RAISE EXCEPTION 'FAIL 2: org B member can read org A / solo (cross-tenant leak)'; END IF;
  IF total <> 1 THEN RAISE EXCEPTION 'FAIL 2: org B should see 1 row, saw %', total; END IF;
  RAISE NOTICE 'PASS 2: org B member sees own org only';

  -- ---- 3. Anonymous: deny-by-default, sees nothing ----
  PERFORM set_config('role','anon', true);
  PERFORM set_config('request.jwt.claims','{}', true);
  SELECT count(*) INTO total FROM "Participant" WHERE id LIKE 'verify_%';
  IF total <> 0 THEN RAISE EXCEPTION 'FAIL 3: anon can read % rows (should be 0)', total; END IF;
  RAISE NOTICE 'PASS 3: anon sees nothing';

  -- ---- 4. WITH CHECK: org A member cannot insert a row tagged org B ----
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);
  blocked := false;
  BEGIN
    INSERT INTO "Participant"(id, name, "userId", "organisationId")
      VALUES ('verify_evil','x','00000000-0000-0000-0000-0000000000a1','verify_orgB');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL 4: org A member inserted a row tagged org B'; END IF;
  RAISE NOTICE 'PASS 4: WITH CHECK blocks cross-tenant insert';

  -- ---- 5. Cross-tenant UPDATE affects 0 rows ----
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);
  WITH upd AS (UPDATE "Participant" SET name='hijacked' WHERE id='verify_pB' RETURNING 1)
  SELECT count(*) INTO affected FROM upd;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL 5: cross-tenant UPDATE touched % row(s)', affected; END IF;
  RAISE NOTICE 'PASS 5: cross-tenant UPDATE affects no rows';

  -- ---- 6. Completeness: every public base table has RLS enabled (back to owner) ----
  PERFORM set_config('role', owner_role, true);
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity ORDER BY 1
  LOOP bad := bad || ' ' || r.relname; END LOOP;
  IF length(bad) > 0 THEN RAISE EXCEPTION 'FAIL 6: tables in public WITHOUT RLS enabled:%', bad; END IF;
  RAISE NOTICE 'PASS 6: every public base table has RLS enabled';

  -- ---- Cleanup (as owner) ----
  PERFORM set_config('role', owner_role, true);
  DELETE FROM "Participant"  WHERE id LIKE 'verify_%';
  DELETE FROM "Organisation" WHERE id LIKE 'verify_%';
  RAISE NOTICE '============================================';
  RAISE NOTICE ' ALL RLS CHECKS PASSED';
  RAISE NOTICE '============================================';
EXCEPTION WHEN OTHERS THEN
  -- Always clean up the fixtures, even on a failed assertion, then re-raise.
  PERFORM set_config('role', owner_role, true);
  DELETE FROM "Participant"  WHERE id LIKE 'verify_%';
  DELETE FROM "Organisation" WHERE id LIKE 'verify_%';
  RAISE;
END $$;
