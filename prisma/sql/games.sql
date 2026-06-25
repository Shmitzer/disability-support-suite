-- games.sql — Game Suite (System A) foundation tables.
-- Backs the Prisma models in schema.prisma; see docs/GAME_SUITE_SINGLEPLAYER_100.md.
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand, then the RLS file:
--     psql "$DIRECT_URL" -f prisma/sql/games.sql
--     psql "$DIRECT_URL" -f prisma/sql/games_rls.sql
-- Idempotent / re-runnable (CREATE TABLE/INDEX IF NOT EXISTS).
--
-- System A only: these tables are the ONLY place therapeutic XP / NDIS goal
-- progress lives. No social/multiplayer code may ever write here.

-- ── NDISGoal ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NDISGoal" (
  "id" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "targetDate" TIMESTAMP(3),
  "progressType" TEXT NOT NULL DEFAULT 'percentage',
  "targetValue" INTEGER NOT NULL DEFAULT 100,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdByRole" TEXT,
  "createdById" TEXT,
  "isVisibleToParticipant" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NDISGoal_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "NDISGoal_participantId_status_idx" ON "NDISGoal" ("participantId","status");
CREATE INDEX IF NOT EXISTS "NDISGoal_organisationId_status_idx" ON "NDISGoal" ("organisationId","status");

-- ── GoalProgress (immutable evidence log) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GoalProgress" (
  "id" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "valueAdded" INTEGER NOT NULL,
  "note" TEXT,
  "recordedById" TEXT,
  "organisationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId")
    REFERENCES "NDISGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX IF NOT EXISTS "GoalProgress_goalId_createdAt_idx" ON "GoalProgress" ("goalId","createdAt");

-- ── GoalGameLink (which games feed which goals) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "GoalGameLink" (
  "id" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "gameSlug" TEXT NOT NULL,
  "xpPerSession" INTEGER NOT NULL DEFAULT 10,
  "organisationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoalGameLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GoalGameLink_goalId_fkey" FOREIGN KEY ("goalId")
    REFERENCES "NDISGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "GoalGameLink_goalId_gameSlug_key" ON "GoalGameLink" ("goalId","gameSlug");
CREATE INDEX IF NOT EXISTS "GoalGameLink_gameSlug_idx" ON "GoalGameLink" ("gameSlug");

-- ── GameSession ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GameSession" (
  "id" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT,
  "gameSlug" TEXT NOT NULL,
  "tier" TEXT,
  "difficulty" TEXT NOT NULL DEFAULT 'medium',
  "score" INTEGER NOT NULL DEFAULT 0,
  "maxScore" INTEGER NOT NULL DEFAULT 0,
  "durationSecs" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "GameSession_participantId_gameSlug_idx" ON "GameSession" ("participantId","gameSlug");
CREATE INDEX IF NOT EXISTS "GameSession_organisationId_createdAt_idx" ON "GameSession" ("organisationId","createdAt");

-- ── ParticipantXP (one running total per participant) ─────────────────────────
CREATE TABLE IF NOT EXISTS "ParticipantXP" (
  "id" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT,
  "totalXP" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "lastPlayedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipantXP_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipantXP_participantId_key" ON "ParticipantXP" ("participantId");
CREATE INDEX IF NOT EXISTS "ParticipantXP_organisationId_idx" ON "ParticipantXP" ("organisationId");
