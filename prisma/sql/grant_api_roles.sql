-- grant_api_roles.sql — restore Supabase API-role privileges on schema public.
--
-- WHY THIS EXISTS: `prisma db push --force-reset` (and `prisma migrate reset`) DROP
-- and recreate schema `public`. That wipes the default grants Supabase gives its API
-- roles (anon, authenticated, service_role), so every Data API / auth query fails with
-- "permission denied for schema public". RLS is NOT affected — it still decides which
-- ROWS each role sees; these grants only restore SCHEMA/TABLE access so RLS can run.
--
-- RUN THIS after any schema reset, BEFORE auth_hook.sql (so the hook's later REVOKE on
-- custom_access_token_hook stays in effect). Idempotent — safe to re-run anytime.
--   Supabase SQL Editor → paste → Run   (or: psql "$DIRECT_URL" -f prisma/sql/grant_api_roles.sql)
--
-- NOTE: deliberately grants TABLES + SEQUENCES only, NOT functions/routines — this app
-- exposes no client-callable RPCs (Option A: the app talks to the DB via Prisma), and
-- not granting EXECUTE keeps the auth hook and other functions off-limits to clients.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Future tables/sequences created by the migration role inherit the same grants.
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
