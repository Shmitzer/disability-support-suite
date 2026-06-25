-- schema_baseline.sql — full table/enum DDL for the Disability Support Suite schema.
--
-- PURPOSE: a phone/SQL-editor-friendly way to stand the tables up WITHOUT a terminal
-- (paste into Supabase → SQL Editor → Run). Generated from prisma/schema.prisma via:
--   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
--
-- This is SCHEMA ONLY. Apply the rest in order afterwards (see docs/PRODUCTION_CUTOVER.md):
--   search_vector.sql · auth_hook.sql · rls_policies.sql   (backfill_tenant.sql only for
--   a pre-existing DB with NULL userId rows). Those are order-sensitive and security-
--   critical, so they are kept as separate files — do NOT fold them in here.
--
-- CAVEAT: pasting this does NOT create Prisma's migration history (_prisma_migrations).
-- For a production cutover prefer the documented `prisma migrate dev --name init` flow
-- from a laptop; this baseline is best for staging / a quick phone spin-up. Regenerate
-- with the command above whenever the schema changes.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SOLO_WORKER', 'WORKER', 'SUPERVISOR', 'ADMIN', 'PARTICIPANT', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "SectorMode" AS ENUM ('NDIS', 'AGED_CARE', 'MENTAL_HEALTH', 'COMMUNITY_SERVICES', 'EARLY_CHILDHOOD');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorMode" "SectorMode" NOT NULL DEFAULT 'NDIS',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT,
    "autoSuggestCap" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "supabaseUserId" TEXT,
    "organisationId" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "lastSeenVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ndisNumber" TEXT,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerParticipant" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "rawNotes" TEXT NOT NULL,
    "generatedNote" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "participantId" TEXT NOT NULL,
    "location" TEXT,
    "createdById" TEXT NOT NULL,
    "allocatedToId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "clockOnAt" TIMESTAMP(3),
    "clockOffAt" TIMESTAMP(3),
    "allocatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "idempotencyKey" TEXT,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftEvent" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT,
    "notes" TEXT NOT NULL,
    "photos" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "derivedFromId" TEXT, -- source Note for AI-extracted entries (prisma/sql/note_extraction.sql)
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEntry_derivedFromId_idx" ON "LogEntry"("derivedFromId");

-- CreateTable
CREATE TABLE "ShiftReport" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceLog" TEXT NOT NULL,
    "model" TEXT,
    "activitiesLog" JSONB,
    "incidentFlag" BOOLEAN NOT NULL DEFAULT false,
    "incidentFields" JSONB,
    "idempotencyKey" TEXT,
    "generatedByModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "questions" TEXT,
    "clarifications" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnedOption" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "source" TEXT NOT NULL DEFAULT 'custom',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "userId" TEXT,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnedOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClockAmendmentRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "proposedValue" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClockAmendmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "organisationId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Tamper-evidence hash chain (see src/lib/audit.ts; prisma/sql/audit_hash_chain.sql).
    "seq" BIGSERIAL,
    "prevHash" TEXT,
    "hash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_seq_idx" ON "AuditLog"("organisationId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_supabaseUserId_key" ON "Worker"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_ndisNumber_key" ON "Participant"("ndisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerParticipant_workerId_participantId_key" ON "WorkerParticipant"("workerId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_idempotencyKey_key" ON "Shift"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LogEntry_idempotencyKey_key" ON "LogEntry"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftReport_idempotencyKey_key" ON "ShiftReport"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LearnedOption_kind_name_key" ON "LearnedOption"("kind", "name");

-- AddForeignKey
ALTER TABLE "WorkerParticipant" ADD CONSTRAINT "WorkerParticipant_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerParticipant" ADD CONSTRAINT "WorkerParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_allocatedToId_fkey" FOREIGN KEY ("allocatedToId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEvent" ADD CONSTRAINT "ShiftEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEvent" ADD CONSTRAINT "ShiftEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReport" ADD CONSTRAINT "ShiftReport_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockAmendmentRequest" ADD CONSTRAINT "ClockAmendmentRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockAmendmentRequest" ADD CONSTRAINT "ClockAmendmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockAmendmentRequest" ADD CONSTRAINT "ClockAmendmentRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable: WaitlistSignup (pre-launch email capture; non-tenant, see schema.prisma)
CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'landing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistSignup_email_key" ON "WaitlistSignup"("email");


-- CreateTable: RBAC frame — Membership / ParticipantAccessGrant / Consent
-- (see schema.prisma + prisma/sql/rbac_grants.sql). Authorization = org-membership
-- roles ∪ active participant grants (+ platform override), resolved in src/lib/access.ts.
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workerId_organisationId_role_key" ON "Membership"("workerId", "organisationId", "role");
CREATE INDEX "Membership_workerId_status_idx" ON "Membership"("workerId", "status");
CREATE INDEX "Membership_organisationId_status_idx" ON "Membership"("organisationId", "status");

CREATE TABLE "ParticipantAccessGrant" (
    "id" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organisationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "grantedById" TEXT,
    "consentId" TEXT,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantAccessGrant_principalId_status_idx" ON "ParticipantAccessGrant"("principalId", "status");
CREATE INDEX "ParticipantAccessGrant_participantId_status_idx" ON "ParticipantAccessGrant"("participantId", "status");

CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedToPrincipalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "method" TEXT,
    "capturedById" TEXT,
    "organisationId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consent_participantId_scope_status_idx" ON "Consent"("participantId", "scope", "status");


-- CreateTable: ParticipantCareProfile — condition tags + support-need flags that
-- tailor capture chips (see src/lib/care-needs.ts; prisma/sql/participant_care_profile.sql)
CREATE TABLE "ParticipantCareProfile" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "conditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "supportNeeds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "needConfig" JSONB,
    "organisationId" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantCareProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantCareProfile_participantId_key" ON "ParticipantCareProfile"("participantId");
CREATE INDEX "ParticipantCareProfile_organisationId_idx" ON "ParticipantCareProfile"("organisationId");
