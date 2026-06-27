-- care_tasks.sql — #1 task/ADL checklist (plan + per-shift completions).
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand: psql "$DIRECT_URL" -f this file.
CREATE TABLE IF NOT EXISTS "CareTask" (
    "id" TEXT NOT NULL, "participantId" TEXT NOT NULL, "organisationId" TEXT,
    "title" TEXT NOT NULL, "category" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CareTask_participantId_active_idx" ON "CareTask" ("participantId","active");

CREATE TABLE IF NOT EXISTS "ShiftTaskCompletion" (
    "id" TEXT NOT NULL, "shiftId" TEXT NOT NULL, "careTaskId" TEXT NOT NULL,
    "status" TEXT NOT NULL, "note" TEXT, "completedById" TEXT, "organisationId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftTaskCompletion_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftTaskCompletion_shiftId_careTaskId_key" ON "ShiftTaskCompletion" ("shiftId","careTaskId");
CREATE INDEX IF NOT EXISTS "ShiftTaskCompletion_shiftId_idx" ON "ShiftTaskCompletion" ("shiftId");
