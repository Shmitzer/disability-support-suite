-- hub.sql — Participant Hub backend slice (HUB_DATA_MODEL.md).
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand (editor-safe / psql): this file is
--    idempotent and re-runnable. NEVER `prisma db push`.
--
-- Adds the attendance layer above Shift:
--   • three new tables (HubDevice / HubSession / HubCheckIn), each with a standard
--     org tenant_isolation RLS policy (Rule 5/10),
--   • five additive nullable columns on "LogEntry" + makes "shiftId" nullable,
--   • two PIN columns on "Worker" (server-side quick-unlock for shared-device tap),
--   • a back-compatible backfill of existing LogEntry rows.
-- All additive: existing rows and the per-worker Shift path are untouched.

BEGIN;

-- ── New tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HubDevice" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "participantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pairedSecretHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HubDevice_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "HubDevice_participantId_status_idx" ON "HubDevice" ("participantId","status");

CREATE TABLE IF NOT EXISTS "HubSession" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "deviceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HubSession_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "HubSession_participantId_status_idx" ON "HubSession" ("participantId","status");

CREATE TABLE IF NOT EXISTS "HubCheckIn" (
    "id" TEXT NOT NULL,
    "hubSessionId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "capacity" TEXT NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "shiftId" TEXT,
    "accessGrantId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HubCheckIn_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "HubCheckIn_hubSessionId_idx" ON "HubCheckIn" ("hubSessionId");
CREATE INDEX IF NOT EXISTS "HubCheckIn_workerId_idx" ON "HubCheckIn" ("workerId");

-- ── LogEntry: make shiftId nullable + add the five hub columns ────────────────────
ALTER TABLE "LogEntry" ALTER COLUMN "shiftId" DROP NOT NULL;
ALTER TABLE "LogEntry"
  ADD COLUMN IF NOT EXISTS "hubCheckInId"     TEXT,
  ADD COLUMN IF NOT EXISTS "loggedByWorkerId" TEXT,
  ADD COLUMN IF NOT EXISTS "actingCapacity"   TEXT,
  ADD COLUMN IF NOT EXISTS "participantId"    TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDevice"     TEXT;
CREATE INDEX IF NOT EXISTS "LogEntry_participantId_timestamp_idx" ON "LogEntry" ("participantId","timestamp");
CREATE INDEX IF NOT EXISTS "LogEntry_hubCheckInId_idx" ON "LogEntry" ("hubCheckInId");

-- ── Worker: server-side quick-unlock PIN ──────────────────────────────────────────
ALTER TABLE "Worker"
  ADD COLUMN IF NOT EXISTS "pinHash"  TEXT,
  ADD COLUMN IF NOT EXISTS "pinSetAt" TIMESTAMP(3);

-- ── Backfill existing LogEntry rows (safe; only fills NULLs) ───────────────────────
-- Existing entries are all WORKER-capacity, attributed to their shift's allocatee,
-- and belong to the shift's participant. shiftId stays as-is (still set on these).
UPDATE "LogEntry" e SET
    "actingCapacity"   = COALESCE(e."actingCapacity", 'WORKER'),
    "participantId"    = COALESCE(e."participantId", s."participantId"),
    "loggedByWorkerId" = COALESCE(e."loggedByWorkerId", s."allocatedToId")
FROM "Shift" s
WHERE e."shiftId" = s."id"
  AND (e."actingCapacity" IS NULL OR e."participantId" IS NULL OR e."loggedByWorkerId" IS NULL);

-- ── RLS: standard org tenant_isolation on the three new tables (Rule 5/10) ─────────
-- Matches rls_policies.sql / feature_tables_rls.sql. Under Option A the app reaches
-- Postgres via the privileged Prisma role and BYPASSES RLS; these policies lock the
-- public Data API so a leaked anon key can't cross tenants.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['HubDevice','HubSession','HubCheckIn'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
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

COMMIT;

-- Dry-run note: review with `BEGIN; \i prisma/sql/hub.sql; ROLLBACK;` before COMMIT.
