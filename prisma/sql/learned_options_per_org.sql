-- learned_options_per_org.sql — schema change for #7: per-org custom options on
-- top of shared global seeds, plus a read path for de-identified analytics.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. This is a design artifact, like the other files in
--     prisma/sql/. Apply it by hand on the laptop AFTER reviewing it, the same way
--     rls_policies.sql / search_vector.sql are applied (psql "$DIRECT_URL" -f …).
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Model recap (prisma/schema.prisma → LearnedOption):
--   • organisationId NULL  →  a GLOBAL row (curated seed, or a globally-promoted
--     option) shared by every tenant.
--   • organisationId SET   →  a row PRIVATE to that organisation (a word its own
--     workers typed that isn't a global seed yet).
--   • userId stays the owner's auth uid for org-scoped rows; NULL for globals.
--
-- The matching layer (src/lib/learned-options.ts) reads "global seeds + this org's
-- own options" and stamps new suggestions with the worker's organisationId. This
-- file makes the database enforce that model.

BEGIN;

-- 1) Uniqueness ------------------------------------------------------------------
-- The old constraint was global: one (kind, name) across the whole platform, which
-- stopped two different orgs from ever having the same custom word, and stopped a
-- per-org "Coffee" from coexisting with the global seed "Coffee".
--
-- Replace it with one unique row per (kind, name) *within each scope*: one global
-- row, plus at most one row per organisation. COALESCE folds NULL (global) into a
-- stable key so Postgres treats all global rows as one scope (a plain multi-column
-- UNIQUE would let unlimited NULL-org duplicates through, since NULL <> NULL).
DROP INDEX IF EXISTS "LearnedOption_kind_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "LearnedOption_kind_name_org_key"
  ON "LearnedOption" ("kind", "name", (COALESCE("organisationId", '')));

-- 2) Read path -------------------------------------------------------------------
-- The picker reads "approved, for this kind, global OR mine". Index that shape so
-- it stays fast as orgs accumulate their own options.
CREATE INDEX IF NOT EXISTS "LearnedOption_kind_status_org_idx"
  ON "LearnedOption" ("kind", "status", "organisationId");

-- 3) RLS -------------------------------------------------------------------------
-- LearnedOption is currently covered by the generic tenant_isolation loop in
-- rls_policies.sql, whose USING clause is (userId = me OR organisationId = my org).
-- That HIDES global seeds (organisationId IS NULL, userId IS NULL) from the
-- `authenticated` role. Globals are meant to be shared, so give LearnedOption its
-- own policy: everyone may READ global rows + their own org's rows; writes are
-- still tenant-scoped, and global rows are written only by the platform/service
-- role (which bypasses RLS), never by an authenticated client.
ALTER TABLE "LearnedOption" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LearnedOption";
DROP POLICY IF EXISTS learned_option_read ON "LearnedOption";
DROP POLICY IF EXISTS learned_option_write ON "LearnedOption";

-- Read: global seeds (org IS NULL) + your own org's options.
CREATE POLICY learned_option_read ON "LearnedOption"
  FOR SELECT TO authenticated
  USING (
    "organisationId" IS NULL
    OR "organisationId" = (auth.jwt() ->> 'organisationId')
  );

-- Write (INSERT/UPDATE/DELETE): only rows belonging to your own org — never a
-- global row, never another tenant's row. Global seeds/promotions are managed by
-- the service role out-of-band.
CREATE POLICY learned_option_write ON "LearnedOption"
  FOR ALL TO authenticated
  USING ("organisationId" = (auth.jwt() ->> 'organisationId'))
  WITH CHECK ("organisationId" = (auth.jwt() ->> 'organisationId'));

COMMIT;

-- 4) Prisma schema (apply alongside, by hand) ------------------------------------
-- Mirror the new uniqueness in prisma/schema.prisma so `prisma generate` and future
-- migrations agree with the database. The COALESCE expression index can't be
-- expressed as a plain @@unique, so keep it as raw SQL above and drop the old
-- @@unique([kind, name]) from the model (replace with @@index hints only):
--
--   model LearnedOption {
--     …
--     @@index([kind, status, organisationId])
--     // unique (kind, name, coalesce(organisationId,'')) enforced via raw SQL —
--     // see prisma/sql/learned_options_per_org.sql
--   }
