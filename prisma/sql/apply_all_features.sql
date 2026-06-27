-- apply_all_features.sql — the single ORDERED apply script for the unapplied
-- Phase-0 feature tables, plus a post-apply RLS sweep for the new tables.
--
-- Run by hand in order, with the DIRECT connection (NOT the pooler, NOT `prisma
-- db push`), after reviewing each included file:
--
--     psql "$DIRECT_URL" -f prisma/sql/apply_all_features.sql
--
-- Then re-run the RLS verifier in the Supabase SQL editor:
--
--     prisma/sql/verify_rls_editor.sql   (expect every public table RLS-enabled)
--
-- Every included file is idempotent / re-runnable (CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS), so this script is safe to
-- re-run. `psql` aborts on the first error (ON_ERROR_STOP) so a partial apply
-- can't silently skip a step.
--
-- ORDER MATTERS:
--   1. audit_hash_chain  — the tamper-evident AuditLog the rest write into.
--   2. rbac_grants       — Membership / ParticipantAccessGrant / Consent (the
--                          authorization frame resolvePrincipal() reads).
--   3. feature DDL        — the ~11 feature tables, additive.
--   4. schema tweaks      — note_extraction, org_auto_suggest_cap,
--                           learned_options_per_org (column/constraint changes).
--   5. feature_tables_rls — enable RLS + tenant_isolation on the new tables that
--                           shipped their DDL without it.

\set ON_ERROR_STOP on

\echo '== 1/14  audit_hash_chain.sql (apply FIRST) =='
\i prisma/sql/audit_hash_chain.sql

\echo '== 2/14  rbac_grants.sql (apply SECOND) =='
\i prisma/sql/rbac_grants.sql

\echo '== 3/14  care_tasks.sql =='
\i prisma/sql/care_tasks.sql

\echo '== 4/14  credentials.sql =='
\i prisma/sql/credentials.sql

\echo '== 5/14  incidents.sql =='
\i prisma/sql/incidents.sql

\echo '== 6/14  notifications_med_evv_billing.sql =='
\i prisma/sql/notifications_med_evv_billing.sql

\echo '== 7/14  messaging.sql =='
\i prisma/sql/messaging.sql

\echo '== 8/14  documents.sql =='
\i prisma/sql/documents.sql

\echo '== 9/14  assistant.sql =='
\i prisma/sql/assistant.sql

\echo '== 10/14 note_extraction.sql =='
\i prisma/sql/note_extraction.sql

\echo '== 11/14 participant_care_profile.sql =='
\i prisma/sql/participant_care_profile.sql

\echo '== 12/14 org_auto_suggest_cap.sql =='
\i prisma/sql/org_auto_suggest_cap.sql

\echo '== 13/14 learned_options_per_org.sql =='
\i prisma/sql/learned_options_per_org.sql

\echo '== 14/14 feature_tables_rls.sql (RLS sweep — apply LAST) =='
\i prisma/sql/feature_tables_rls.sql

\echo '== DONE. Now run prisma/sql/verify_rls_editor.sql in the Supabase SQL editor. =='
