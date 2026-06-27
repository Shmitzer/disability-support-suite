-- apply_phase_g.sql — the ONE ordered, idempotent apply script for everything
-- still unapplied as of Phase G consolidation (2026-06-27).
--
-- ⛔ EDWARD-GATED. Claude Code does NOT run this against the live DB. Apply it by
--    hand, with the DIRECT connection (NOT the pooler, NOT `prisma db push`),
--    after reviewing each included file:
--
--        psql "$DIRECT_URL" -f prisma/sql/apply_phase_g.sql
--
--    Then re-run the RLS verifier in the Supabase SQL editor (expect every public
--    table RLS-enabled):
--
--        prisma/sql/verify_rls_editor.sql
--
-- ---------------------------------------------------------------------------
-- DRY RUN FIRST (strongly recommended)
-- ---------------------------------------------------------------------------
-- Every included file is idempotent / re-runnable (CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS), and `\set ON_ERROR_STOP on`
-- aborts on the first error so a partial apply can't silently skip a step.
--
-- To dry-run the WHOLE script in one rolled-back transaction (applies nothing,
-- but surfaces any error against the live schema), run:
--
--        psql "$DIRECT_URL" --single-transaction \
--             -c 'BEGIN;' -f prisma/sql/apply_phase_g.sql -c 'ROLLBACK;'
--
-- or paste the includes between BEGIN; … ROLLBACK; in the SQL editor. Best of all,
-- run it once against a throwaway Postgres 16 (how the Phase-0 sweep was validated)
-- before touching production. When you are satisfied, run it for real (no ROLLBACK).
--
-- ---------------------------------------------------------------------------
-- ORDER MATTERS (dependency order)
-- ---------------------------------------------------------------------------
--   1. Phase 0 foundation (apply_all_features.sql) — runs audit_hash_chain FIRST,
--      then rbac_grants, the ~11 feature tables, the column/constraint tweaks,
--      and the feature-tables RLS sweep LAST. Everything else builds on this.
--   2. Caira AI brain  (caira_ai.sql) — new CairaFlag table + Worker AI columns.
--   3. Caira org switch (org_caira_enabled.sql) — Organisation.cairaEnabled.
--   4. Caira RLS        (caira_flag_rls.sql) — tenant_isolation on CairaFlag;
--                        MUST run AFTER caira_ai.sql (the table must exist).
--   5. Phase 1.6        (participant_ndis_erasure.sql) — NDIS plan/profile fields
--                        + right-to-erasure tombstones (anonymisedAt/deletedAt).
--   6. Phase 2.4        (ndis_price_guide.sql) — NdisSupportItem reference table
--                        + world-readable-globals RLS.

\set ON_ERROR_STOP on

\echo '== 1/6  Phase 0 foundation — apply_all_features.sql (audit chain → rbac → features → RLS sweep) =='
\i prisma/sql/apply_all_features.sql

\echo '== 2/6  Caira AI brain — caira_ai.sql (CairaFlag table + Worker AI columns) =='
\i prisma/sql/caira_ai.sql

\echo '== 3/6  Caira org switch — org_caira_enabled.sql (Organisation.cairaEnabled) =='
\i prisma/sql/org_caira_enabled.sql

\echo '== 4/6  Caira RLS — caira_flag_rls.sql (tenant_isolation on CairaFlag; AFTER caira_ai) =='
\i prisma/sql/caira_flag_rls.sql

\echo '== 5/6  Phase 1.6 — participant_ndis_erasure.sql (NDIS plan fields + erasure tombstones) =='
\i prisma/sql/participant_ndis_erasure.sql

\echo '== 6/6  Phase 2.4 — ndis_price_guide.sql (NdisSupportItem reference table + RLS) =='
\i prisma/sql/ndis_price_guide.sql

\echo '== DONE. Now run prisma/sql/verify_rls_editor.sql in the Supabase SQL editor (expect every public table RLS-enabled). =='
