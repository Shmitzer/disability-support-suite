-- notifications_med_evv_billing.sql — batch: #5 notifications, #6 medication chart/eMAR,
-- #11 visit verification (EVV), #8/#13 budget + billable items.
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand: psql "$DIRECT_URL" -f this file.

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "organisationId" TEXT, "type" TEXT NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT, "link" TEXT, "entityType" TEXT, "entityId" TEXT,
  "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification" ("userId","readAt");

CREATE TABLE IF NOT EXISTS "Medication" (
  "id" TEXT NOT NULL, "participantId" TEXT NOT NULL, "organisationId" TEXT, "name" TEXT NOT NULL,
  "dose" TEXT, "route" TEXT, "frequency" TEXT, "scheduleTimes" JSONB, "prn" BOOLEAN NOT NULL DEFAULT false,
  "prnProtocol" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT, "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Medication_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "Medication_participantId_active_idx" ON "Medication" ("participantId","active");

CREATE TABLE IF NOT EXISTS "MedicationAdministration" (
  "id" TEXT NOT NULL, "medicationId" TEXT NOT NULL, "participantId" TEXT NOT NULL, "shiftId" TEXT,
  "organisationId" TEXT, "status" TEXT NOT NULL, "scheduledAt" TIMESTAMP(3),
  "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "administeredById" TEXT,
  "witnessedById" TEXT, "dose" TEXT, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MedicationAdministration_participantId_administeredAt_idx" ON "MedicationAdministration" ("participantId","administeredAt");
CREATE INDEX IF NOT EXISTS "MedicationAdministration_medicationId_idx" ON "MedicationAdministration" ("medicationId");

CREATE TABLE IF NOT EXISTS "VisitVerification" (
  "id" TEXT NOT NULL, "shiftId" TEXT NOT NULL, "organisationId" TEXT, "event" TEXT NOT NULL,
  "lat" DOUBLE PRECISION, "lng" DOUBLE PRECISION, "accuracy" DOUBLE PRECISION,
  "method" TEXT NOT NULL DEFAULT 'gps', "capturedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitVerification_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "VisitVerification_shiftId_idx" ON "VisitVerification" ("shiftId");

CREATE TABLE IF NOT EXISTS "ParticipantBudget" (
  "id" TEXT NOT NULL, "participantId" TEXT NOT NULL, "organisationId" TEXT, "category" TEXT NOT NULL,
  "allocatedCents" INTEGER NOT NULL DEFAULT 0, "periodStart" TIMESTAMP(3), "periodEnd" TIMESTAMP(3),
  "notes" TEXT, "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipantBudget_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "ParticipantBudget_participantId_idx" ON "ParticipantBudget" ("participantId");

CREATE TABLE IF NOT EXISTS "BillableItem" (
  "id" TEXT NOT NULL, "participantId" TEXT NOT NULL, "shiftId" TEXT, "organisationId" TEXT,
  "category" TEXT, "lineItemCode" TEXT, "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL DEFAULT 0, "amountCents" INTEGER NOT NULL DEFAULT 0,
  "date" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "claimRef" TEXT, "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillableItem_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "BillableItem_participantId_status_idx" ON "BillableItem" ("participantId","status");
CREATE INDEX IF NOT EXISTS "BillableItem_organisationId_status_idx" ON "BillableItem" ("organisationId","status");
