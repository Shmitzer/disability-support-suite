-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sectorMode" TEXT NOT NULL DEFAULT 'NDIS',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "organisationId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClockAmendmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "proposedValue" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClockAmendmentRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClockAmendmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClockAmendmentRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClockAmendmentRequest" ("createdAt", "decidedAt", "decidedById", "field", "id", "proposedValue", "reason", "requestedById", "shiftId", "status") SELECT "createdAt", "decidedAt", "decidedById", "field", "id", "proposedValue", "reason", "requestedById", "shiftId", "status" FROM "ClockAmendmentRequest";
DROP TABLE "ClockAmendmentRequest";
ALTER TABLE "new_ClockAmendmentRequest" RENAME TO "ClockAmendmentRequest";
CREATE TABLE "new_LearnedOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "source" TEXT NOT NULL DEFAULT 'custom',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LearnedOption" ("createdAt", "id", "kind", "lastUsedAt", "name", "sortOrder", "source", "status", "useCount") SELECT "createdAt", "id", "kind", "lastUsedAt", "name", "sortOrder", "source", "status", "useCount" FROM "LearnedOption";
DROP TABLE "LearnedOption";
ALTER TABLE "new_LearnedOption" RENAME TO "LearnedOption";
CREATE UNIQUE INDEX "LearnedOption_kind_name_key" ON "LearnedOption"("kind", "name");
CREATE TABLE "new_LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT,
    "notes" TEXT NOT NULL,
    "photos" TEXT,
    "timestamp" DATETIME NOT NULL,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LogEntry" ("category", "createdAt", "detail", "id", "notes", "photos", "shiftId", "timestamp") SELECT "category", "createdAt", "detail", "id", "notes", "photos", "shiftId", "timestamp" FROM "LogEntry";
DROP TABLE "LogEntry";
ALTER TABLE "new_LogEntry" RENAME TO "LogEntry";
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ndisNumber" TEXT,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Participant" ("createdAt", "id", "name", "ndisNumber") SELECT "createdAt", "id", "name", "ndisNumber" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
CREATE UNIQUE INDEX "Participant_ndisNumber_key" ON "Participant"("ndisNumber");
CREATE TABLE "new_ProgressNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "rawNotes" TEXT NOT NULL,
    "generatedNote" TEXT NOT NULL,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProgressNote" ("createdAt", "generatedNote", "id", "participantId", "rawNotes") SELECT "createdAt", "generatedNote", "id", "participantId", "rawNotes" FROM "ProgressNote";
DROP TABLE "ProgressNote";
ALTER TABLE "new_ProgressNote" RENAME TO "ProgressNote";
CREATE TABLE "new_Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "participantId" TEXT NOT NULL,
    "location" TEXT,
    "createdById" TEXT NOT NULL,
    "allocatedToId" TEXT,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledEnd" DATETIME NOT NULL,
    "clockOnAt" DATETIME,
    "clockOffAt" DATETIME,
    "allocatedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shift_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_allocatedToId_fkey" FOREIGN KEY ("allocatedToId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("allocatedAt", "allocatedToId", "cancelReason", "cancelledAt", "clockOffAt", "clockOnAt", "createdAt", "createdById", "id", "location", "participantId", "scheduledEnd", "scheduledStart", "status") SELECT "allocatedAt", "allocatedToId", "cancelReason", "cancelledAt", "clockOffAt", "clockOnAt", "createdAt", "createdById", "id", "location", "participantId", "scheduledEnd", "scheduledStart", "status" FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
CREATE TABLE "new_ShiftEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShiftEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShiftEvent" ("actorId", "createdAt", "detail", "id", "shiftId", "type") SELECT "actorId", "createdAt", "detail", "id", "shiftId", "type" FROM "ShiftEvent";
DROP TABLE "ShiftEvent";
ALTER TABLE "new_ShiftEvent" RENAME TO "ShiftEvent";
CREATE TABLE "new_ShiftReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceLog" TEXT NOT NULL,
    "model" TEXT,
    "activitiesLog" TEXT,
    "incidentFlag" BOOLEAN NOT NULL DEFAULT false,
    "incidentFields" TEXT,
    "idempotencyKey" TEXT,
    "generatedByModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "questions" TEXT,
    "clarifications" TEXT,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftReport_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShiftReport" ("approvedAt", "clarifications", "createdAt", "id", "model", "questions", "shiftId", "sourceLog", "status", "summary", "updatedAt") SELECT "approvedAt", "clarifications", "createdAt", "id", "model", "questions", "shiftId", "sourceLog", "status", "summary", "updatedAt" FROM "ShiftReport";
DROP TABLE "ShiftReport";
ALTER TABLE "new_ShiftReport" RENAME TO "ShiftReport";
CREATE UNIQUE INDEX "ShiftReport_idempotencyKey_key" ON "ShiftReport"("idempotencyKey");
CREATE TABLE "new_Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "supabaseUserId" TEXT,
    "organisationId" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT,
    "trialEndsAt" DATETIME,
    "lastSeenVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Worker" ("createdAt", "id", "name", "role") SELECT "createdAt", "id", "name", "role" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
CREATE UNIQUE INDEX "Worker_supabaseUserId_key" ON "Worker"("supabaseUserId");
CREATE TABLE "new_WorkerParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerParticipant_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkerParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkerParticipant" ("createdAt", "id", "participantId", "workerId") SELECT "createdAt", "id", "participantId", "workerId" FROM "WorkerParticipant";
DROP TABLE "WorkerParticipant";
ALTER TABLE "new_WorkerParticipant" RENAME TO "WorkerParticipant";
CREATE UNIQUE INDEX "WorkerParticipant_workerId_participantId_key" ON "WorkerParticipant"("workerId", "participantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
