/*
  Warnings:

  - You are about to drop the column `endedAt` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `workerName` on the `Shift` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledEnd` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledStart` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkerParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerParticipant_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkerParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShiftEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClockAmendmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "proposedValue" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClockAmendmentRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClockAmendmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClockAmendmentRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shift_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_allocatedToId_fkey" FOREIGN KEY ("allocatedToId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("createdAt", "id", "participantId") SELECT "createdAt", "id", "participantId" FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkerParticipant_workerId_participantId_key" ON "WorkerParticipant"("workerId", "participantId");
