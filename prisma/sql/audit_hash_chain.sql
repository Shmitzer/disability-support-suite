-- audit_hash_chain.sql — make AuditLog tamper-evident (hash chain).
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Adds three columns to AuditLog (see prisma/schema.prisma + src/lib/audit.ts):
--   • seq      — strict append order within the table (BIGSERIAL).
--   • prevHash — the previous row's hash in this chain (NULL at a chain's genesis).
--   • hash     — sha256(prevHash + canonical(payload)); ties this row to history.
--
-- One chain per organisationId (NULL-org = the platform/system chain). Editing or
-- deleting any row breaks every later row's hash → detectable by verifyAuditChain().
-- Columns are nullable so rows written before this migration remain valid; new
-- writes (post-deploy) populate them. The app serialises appends per chain with a
-- Postgres advisory lock, so no DB-side trigger is required to prevent forks.

BEGIN;

-- BIGSERIAL creates the sequence + backfills existing rows with ascending values
-- in (effectively) insertion order, then sets the column NOT NULL. Existing rows
-- keep NULL hash/prevHash (they predate the chain); verification starts from the
-- first row that has a hash. New rows are chained by the app from there on.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "seq" BIGSERIAL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "hash" TEXT;

-- `seq` is unique (it's the append-order key the chain reads as "the tail").
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_seq_key" ON "AuditLog" ("seq");

-- Fast "latest row in this chain" lookup on append, and ordered replay on verify.
CREATE INDEX IF NOT EXISTS "AuditLog_organisationId_seq_idx"
  ON "AuditLog" ("organisationId", "seq");

COMMIT;

-- Note: the existing append-only RLS on AuditLog (SELECT + INSERT only, no
-- UPDATE/DELETE for the authenticated role — prisma/sql/rls_policies.sql) is what
-- stops ordinary clients from tampering; the hash chain is the second line that
-- catches tampering by anyone who bypasses RLS (service role / direct DB access).
