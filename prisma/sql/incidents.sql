-- incidents.sql — #2 incident register + reportable workflow.
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand: psql "$DIRECT_URL" -f this file.
CREATE TABLE IF NOT EXISTS "Incident" (
    "id" TEXT NOT NULL, "participantId" TEXT, "shiftId" TEXT, "reportedById" TEXT,
    "organisationId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL, "description" TEXT NOT NULL, "immediateAction" TEXT,
    "notified" JSONB, "followUp" TEXT, "reportable" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN', "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "Incident_organisationId_status_idx" ON "Incident" ("organisationId","status");
CREATE INDEX IF NOT EXISTS "Incident_participantId_idx" ON "Incident" ("participantId");
