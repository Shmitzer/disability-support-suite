-- verify_rls.sql — deterministic cross-tenant (BOLA) check for the RLS policies.
-- Run AFTER auth_hook.sql + rls_policies.sql are applied, against a direct
-- connection as the DB owner:
--     psql "$DIRECT_URL" -f prisma/sql/verify_rls.sql
-- (npm run verify:rls wraps this.)
--
-- HOW IT WORKS: Supabase's auth.uid()/auth.jwt() read the request's JWT claims from
-- the `request.jwt.claims` GUC. We set that GUC + switch to the `authenticated`
-- (or `anon`) role to SIMULATE a signed-in user from each org, exactly as the Data
-- API would — so this tests the real policies without signing in or enabling the
-- hook. Everything runs in ONE transaction that ROLLS BACK at the end: no test data
-- is left behind. SET inside a DO block auto-restores on block exit, so each check
-- is isolated.
--
-- A failure RAISEs and (with ON_ERROR_STOP) exits non-zero. "ALL RLS CHECKS PASSED"
-- only prints if every assertion held.
--
-- NOTE: this checks the POLICIES. The auth HOOK (org claim injection) is a separate,
-- dashboard-enabled concern — smoke-test it by signing in and decoding the JWT (it
-- should carry a top-level "organisationId").

\set ON_ERROR_STOP on

BEGIN;

-- Two valid UUIDs to act as two users' auth.uid() (the `sub` claim must cast to uuid).
\set uidA '00000000-0000-0000-0000-0000000000a1'
\set uidB '00000000-0000-0000-0000-0000000000b1'

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as owner → RLS bypassed). userId is set to a DIFFERENT user
-- than the org member on the org-scoped rows, so visibility there can only come
-- from the org claim (proving org-scoping, not just ownership).
-- ---------------------------------------------------------------------------
INSERT INTO public."Organisation"(id, name) VALUES
  ('verify_orgA', 'Verify Org A'),
  ('verify_orgB', 'Verify Org B');

INSERT INTO public."Participant"(id, name, "userId", "organisationId") VALUES
  ('verify_pA',    'Alice (org A)',      'ffffffff-0000-0000-0000-0000000000a9', 'verify_orgA'),
  ('verify_pB',    'Bob (org B)',        'ffffffff-0000-0000-0000-0000000000b9', 'verify_orgB'),
  ('verify_pSolo', 'Solo (owner = A)',   :'uidA',                                 NULL);

-- ===========================================================================
-- 1. Org A member: sees org A rows + own solo row (2); must NOT see org B's row.
-- ===========================================================================
DO $$
DECLARE total int; leaked int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);

  SELECT count(*) INTO total  FROM public."Participant" WHERE id LIKE 'verify_%';
  SELECT count(*) INTO leaked FROM public."Participant" WHERE id = 'verify_pB';

  IF leaked <> 0 THEN
    RAISE EXCEPTION 'BOLA: org A member can read org B participant (cross-tenant leak)';
  END IF;
  IF total <> 2 THEN
    RAISE EXCEPTION 'org A member should see 2 rows (org A + own solo), saw %. '
      'If 0, check that the authenticated role has SELECT on public."Participant".', total;
  END IF;
  RAISE NOTICE 'PASS 1: org A member sees own org only (no leak of org B).';
END $$;

-- ===========================================================================
-- 2. Org B member: sees only org B's row (1); must NOT see org A's or A's solo row.
-- ===========================================================================
DO $$
DECLARE total int; leaked int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000b1","organisationId":"verify_orgB"}', true);

  SELECT count(*) INTO total  FROM public."Participant" WHERE id LIKE 'verify_%';
  SELECT count(*) INTO leaked FROM public."Participant" WHERE id IN ('verify_pA','verify_pSolo');

  IF leaked <> 0 THEN
    RAISE EXCEPTION 'BOLA: org B member can read org A / solo participant (cross-tenant leak)';
  END IF;
  IF total <> 1 THEN
    RAISE EXCEPTION 'org B member should see exactly 1 row, saw %', total;
  END IF;
  RAISE NOTICE 'PASS 2: org B member sees own org only (no leak of org A).';
END $$;

-- ===========================================================================
-- 3. Anonymous (no session): deny-by-default — must see NOTHING.
-- ===========================================================================
DO $$
DECLARE total int;
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);  -- valid empty JSON (not '')

  SELECT count(*) INTO total FROM public."Participant" WHERE id LIKE 'verify_%';
  IF total <> 0 THEN
    RAISE EXCEPTION 'anon can read % participant rows (should be 0 — deny by default)', total;
  END IF;
  RAISE NOTICE 'PASS 3: anonymous role sees nothing (deny by default).';
END $$;

-- ===========================================================================
-- 4. WITH CHECK on INSERT: org A member cannot create a row tagged to org B.
-- ===========================================================================
DO $$
DECLARE blocked boolean := false;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);
  BEGIN
    INSERT INTO public."Participant"(id, name, "userId", "organisationId")
      VALUES ('verify_evil', 'cross-tenant insert',
              '00000000-0000-0000-0000-0000000000a1', 'verify_orgB');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'WITH CHECK: org A member inserted a row tagged org B (should be blocked)';
  END IF;
  RAISE NOTICE 'PASS 4: WITH CHECK blocks inserting into another tenant.';
END $$;

-- ===========================================================================
-- 5. Cross-tenant UPDATE: org A member updating org B''s row affects 0 rows
--    (USING hides it), so it can neither read nor silently mutate it.
-- ===========================================================================
DO $$
DECLARE affected int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","organisationId":"verify_orgA"}', true);

  WITH upd AS (
    UPDATE public."Participant" SET name = 'hijacked' WHERE id = 'verify_pB' RETURNING 1
  )
  SELECT count(*) INTO affected FROM upd;

  IF affected <> 0 THEN
    RAISE EXCEPTION 'cross-tenant UPDATE touched % org B row(s) (should be 0)', affected;
  END IF;
  RAISE NOTICE 'PASS 5: cross-tenant UPDATE affects no rows.';
END $$;

-- Back to the owner role for the catalog check below. (A SET inside the DO blocks
-- above persists to end-of-transaction, so reset it explicitly here.)
RESET ROLE;

-- ===========================================================================
-- 6. Completeness guard: EVERY base table in `public` must have RLS enabled.
--    This catches the real regression risk — a new table shipped without RLS,
--    silently exposed to the Data API (how WaitlistSignup could have slipped).
-- ===========================================================================
DO $$
DECLARE bad text := '';
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    bad := bad || ' ' || r.relname;
  END LOOP;
  IF length(bad) > 0 THEN
    RAISE EXCEPTION 'Tables in public WITHOUT RLS enabled:%', bad;
  END IF;
  RAISE NOTICE 'PASS 6: every base table in public has RLS enabled.';
END $$;

ROLLBACK;

\echo '============================================'
\echo ' ALL RLS CHECKS PASSED'
\echo '============================================'
