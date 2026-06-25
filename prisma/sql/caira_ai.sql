-- caira_ai.sql — Caira AI Brain + Web Access schema.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY (prisma/sql convention). Apply by hand after review:
--     psql "$DIRECT_URL" -f this file.
--
-- Additive, no data loss: new table + new columns with defaults. The readers
-- (/api/caira, flags, preference, admin/caira-access) tolerate the table/columns
-- being absent and degrade gracefully, so the app runs before this is applied.

-- 1. Worker (the app's User) — participant language level + Caira web access grant.
ALTER TABLE "Worker"
  ADD COLUMN IF NOT EXISTS "participantAILevel"      TEXT NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS "cairaWebAccess"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cairaWebAccessGrantedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cairaWebAccessGrantedBy" TEXT;

-- 2. CairaFlag — participant safety flags surfaced to the assigned worker / supervisor.
CREATE TABLE IF NOT EXISTS "CairaFlag" (
  "id"              TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "participantId"   TEXT NOT NULL,
  "participantName" TEXT NOT NULL,
  "triggerMessage"  TEXT NOT NULL,
  "flagReason"      TEXT,
  "seenByWorker"    BOOLEAN NOT NULL DEFAULT false,
  "seenAt"          TIMESTAMP(3),
  "shiftId"         TEXT,
  "workerId"        TEXT,
  "organisationId"  TEXT,

  CONSTRAINT "CairaFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CairaFlag_workerId_seenByWorker_idx"
  ON "CairaFlag" ("workerId", "seenByWorker");
CREATE INDEX IF NOT EXISTS "CairaFlag_organisationId_seenByWorker_idx"
  ON "CairaFlag" ("organisationId", "seenByWorker");
