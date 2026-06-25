-- messaging.sql — #12 care-team messaging + shift handover.
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand: psql "$DIRECT_URL" -f this file.
CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL, "participantId" TEXT NOT NULL, "organisationId" TEXT, "senderId" TEXT,
  "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "Message_participantId_createdAt_idx" ON "Message" ("participantId","createdAt");

CREATE TABLE IF NOT EXISTS "ShiftHandover" (
  "id" TEXT NOT NULL, "shiftId" TEXT NOT NULL, "participantId" TEXT, "organisationId" TEXT,
  "fromWorkerId" TEXT, "toWorkerId" TEXT, "body" TEXT NOT NULL, "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "ShiftHandover_shiftId_idx" ON "ShiftHandover" ("shiftId");
CREATE INDEX IF NOT EXISTS "ShiftHandover_participantId_createdAt_idx" ON "ShiftHandover" ("participantId","createdAt");
