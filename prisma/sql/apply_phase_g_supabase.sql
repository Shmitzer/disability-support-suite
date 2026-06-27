-- apply_phase_g_supabase.sql  —  FLATTENED, Supabase SQL Editor-safe version of apply_phase_g.sql
-- Generated 2026-06-27 (Cowork). All \i includes resolved inline; \set/\echo removed.
-- Each step keeps its own BEGIN/COMMIT (as the source files ship them), so it applies exactly
-- like the psql version. Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) — safe to re-run.
-- HOW: paste the WHOLE file into the Supabase SQL Editor and Run. Then run verify_rls_editor.sql.

-- apply_phase_g.sql — the ONE ordered, idempotent apply script for everything
-- still unapplied as of Phase G consolidation (2026-06-27).
--
-- ⛔ EDWARD-GATED. Claude Code does NOT run this against the live DB. Apply it by
--    hand, with the DIRECT connection (NOT the pooler, NOT `prisma db push`),
--    after reviewing each included file:
--
--        psql "$DIRECT_URL" -f prisma/sql/apply_phase_g.sql
--
--    Then re-run the RLS verifier in the Supabase SQL editor (expect every public
--    table RLS-enabled):
--
--        prisma/sql/verify_rls_editor.sql
--
-- ---------------------------------------------------------------------------
-- DRY RUN FIRST (strongly recommended)
-- ---------------------------------------------------------------------------
-- Every included file is idempotent / re-runnable (CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS), and `\set ON_ERROR_STOP on`
-- aborts on the first error so a partial apply can't silently skip a step.
--
-- To dry-run the WHOLE script in one rolled-back transaction (applies nothing,
-- but surfaces any error against the live schema), run:
--
--        psql "$DIRECT_URL" --single-transaction \
--             -c 'BEGIN;' -f prisma/sql/apply_phase_g.sql -c 'ROLLBACK;'
--
-- or paste the includes between BEGIN; … ROLLBACK; in the SQL editor. Best of all,
-- run it once against a throwaway Postgres 16 (how the Phase-0 sweep was validated)
-- before touching production. When you are satisfied, run it for real (no ROLLBACK).
--
-- ---------------------------------------------------------------------------
-- ORDER MATTERS (dependency order)
-- ---------------------------------------------------------------------------
--   1. Phase 0 foundation (apply_all_features.sql) — runs audit_hash_chain FIRST,
--      then rbac_grants, the ~11 feature tables, the column/constraint tweaks,
--      and the feature-tables RLS sweep LAST. Everything else builds on this.
--   2. Caira AI brain  (caira_ai.sql) — new CairaFlag table + Worker AI columns.
--   3. Caira org switch (org_caira_enabled.sql) — Organisation.cairaEnabled.
--   4. Caira RLS        (caira_flag_rls.sql) — tenant_isolation on CairaFlag;
--                        MUST run AFTER caira_ai.sql (the table must exist).
--   5. Phase 1.6        (participant_ndis_erasure.sql) — NDIS plan/profile fields
--                        + right-to-erasure tombstones (anonymisedAt/deletedAt).
--   6. Phase 2.4        (ndis_price_guide.sql) — NdisSupportItem reference table
--                        + world-readable-globals RLS.


-- >>> inlined: prisma/sql/apply_all_features.sql
-- apply_all_features.sql — the single ORDERED apply script for the unapplied
-- Phase-0 feature tables, plus a post-apply RLS sweep for the new tables.
--
-- Run by hand in order, with the DIRECT connection (NOT the pooler, NOT `prisma
-- db push`), after reviewing each included file:
--
--     psql "$DIRECT_URL" -f prisma/sql/apply_all_features.sql
--
-- Then re-run the RLS verifier in the Supabase SQL editor:
--
--     prisma/sql/verify_rls_editor.sql   (expect every public table RLS-enabled)
--
-- Every included file is idempotent / re-runnable (CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS), so this script is safe to
-- re-run. `psql` aborts on the first error (ON_ERROR_STOP) so a partial apply
-- can't silently skip a step.
--
-- ORDER MATTERS:
--   1. audit_hash_chain  — the tamper-evident AuditLog the rest write into.
--   2. rbac_grants       — Membership / ParticipantAccessGrant / Consent (the
--                          authorization frame resolvePrincipal() reads).
--   3. feature DDL        — the ~11 feature tables, additive.
--   4. schema tweaks      — note_extraction, org_auto_suggest_cap,
--                           learned_options_per_org (column/constraint changes).
--   5. feature_tables_rls — enable RLS + tenant_isolation on the new tables that
--                           shipped their DDL without it.


-- >>> inlined: prisma/sql/audit_hash_chain.sql
-- audit_hash_chain.sql — make AuditLog tamper-evident (hash chain).
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Adds three columns to AuditLog (see prisma/schema.prisma + src/lib/audit.ts):
--   • seq      — strict append order within the table (BIGSERIAL).
--   • prevHash — the previous row's hash in this chain (NULL at a chain's genesis).
--   • hash     — sha256(prevHash + canonical(payload)); ties this row to history.
--
-- One chain per organisationId (NULL-org = the platform/system chain). Editing or
-- deleting any row breaks every later row's hash → detectable by verifyAuditChain().
-- Columns are nullable so rows written before this migration remain valid; new
-- writes (post-deploy) populate them. The app serialises appends per chain with a
-- Postgres advisory lock, so no DB-side trigger is required to prevent forks.

BEGIN;

-- BIGSERIAL creates the sequence + backfills existing rows with ascending values
-- in (effectively) insertion order, then sets the column NOT NULL. Existing rows
-- keep NULL hash/prevHash (they predate the chain); verification starts from the
-- first row that has a hash. New rows are chained by the app from there on.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "seq" BIGSERIAL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "hash" TEXT;

-- `seq` is unique (it's the append-order key the chain reads as "the tail").
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_seq_key" ON "AuditLog" ("seq");

-- Fast "latest row in this chain" lookup on append, and ordered replay on verify.
CREATE INDEX IF NOT EXISTS "AuditLog_organisationId_seq_idx"
  ON "AuditLog" ("organisationId", "seq");

COMMIT;

-- Note: the existing append-only RLS on AuditLog (SELECT + INSERT only, no
-- UPDATE/DELETE for the authenticated role — prisma/sql/rls_policies.sql) is what
-- stops ordinary clients from tampering; the hash chain is the second line that
-- catches tampering by anyone who bypasses RLS (service role / direct DB access).
-- <<< end: prisma/sql/audit_hash_chain.sql

-- >>> inlined: prisma/sql/rbac_grants.sql
-- rbac_grants.sql — the RBAC frame's tables: Membership, ParticipantAccessGrant,
-- Consent (see prisma/schema.prisma + src/lib/rbac.ts + src/lib/access.ts).
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Authorization = the UNION of org-membership roles AND active participant grants
-- (+ platform override). Membership generalises Worker.role/organisationId into a
-- many-to-many; ParticipantAccessGrant scopes an external carer/guardian to ONE
-- participant; Consent is the lawful basis backing such access.

BEGIN;

-- Org-membership roles. `role` reuses the existing Role enum type.
CREATE TABLE IF NOT EXISTS "Membership" (
    "id"             TEXT NOT NULL,
    "workerId"       TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role"           "Role" NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | SUSPENDED | REVOKED
    "invitedById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_workerId_organisationId_role_key"
    ON "Membership" ("workerId", "organisationId", "role");
CREATE INDEX IF NOT EXISTS "Membership_workerId_status_idx" ON "Membership" ("workerId", "status");
CREATE INDEX IF NOT EXISTS "Membership_organisationId_status_idx" ON "Membership" ("organisationId", "status");

-- Participant-scoped grants (external carer / guardian). `role` is a free string
-- grant role (family_carer_clinical | participant_guardian), resolved against
-- GRANT_ROLE_CAPABILITIES in code. "Active" = status='ACTIVE' AND now within
-- [startsAt, expiresAt] (null bounds = open-ended) — enforced in app code.
CREATE TABLE IF NOT EXISTS "ParticipantAccessGrant" (
    "id"             TEXT NOT NULL,
    "principalId"    TEXT NOT NULL,
    "participantId"  TEXT NOT NULL,
    "role"           TEXT NOT NULL,
    "organisationId" TEXT,
    "status"         TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | REVOKED
    "grantedById"    TEXT,
    "consentId"      TEXT,
    "startsAt"       TIMESTAMP(3),
    "expiresAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantAccessGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ParticipantAccessGrant_principalId_status_idx"
    ON "ParticipantAccessGrant" ("principalId", "status");
CREATE INDEX IF NOT EXISTS "ParticipantAccessGrant_participantId_status_idx"
    ON "ParticipantAccessGrant" ("participantId", "status");

-- Consent records (lawful basis for external access / sensitive processing).
CREATE TABLE IF NOT EXISTS "Consent" (
    "id"                   TEXT NOT NULL,
    "participantId"        TEXT NOT NULL,
    "scope"                TEXT NOT NULL,
    "grantedToPrincipalId" TEXT,
    "status"               TEXT NOT NULL DEFAULT 'GRANTED', -- GRANTED | WITHDRAWN
    "method"               TEXT,
    "capturedById"         TEXT,
    "organisationId"       TEXT,
    "grantedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt"          TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Consent_participantId_scope_status_idx"
    ON "Consent" ("participantId", "scope", "status");

COMMIT;

-- RLS (apply alongside rls_policies.sql): all three are tenant tables — scope to
-- the org claim, and additionally let a principal see grants/consent that name
-- them. A starting point (tighten during the RLS cutover):
--
--   ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON "Membership" FOR ALL TO authenticated
--     USING ("organisationId" = (auth.jwt() ->> 'organisationId')
--            OR "workerId" = (select auth.uid())::text);
--
--   ALTER TABLE "ParticipantAccessGrant" ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON "ParticipantAccessGrant" FOR ALL TO authenticated
--     USING ("organisationId" = (auth.jwt() ->> 'organisationId')
--            OR "principalId" = (select auth.uid())::text);
--
--   ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON "Consent" FOR ALL TO authenticated
--     USING ("organisationId" = (auth.jwt() ->> 'organisationId'));
-- <<< end: prisma/sql/rbac_grants.sql

-- >>> inlined: prisma/sql/care_tasks.sql
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
-- <<< end: prisma/sql/care_tasks.sql

-- >>> inlined: prisma/sql/credentials.sql
-- credentials.sql — #7 worker credentials / training (expiry + competency gating).
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand: psql "$DIRECT_URL" -f this file.
CREATE TABLE IF NOT EXISTS "WorkerCredential" (
    "id" TEXT NOT NULL, "workerId" TEXT NOT NULL, "organisationId" TEXT,
    "type" TEXT NOT NULL, "name" TEXT, "issuedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
    "evidenceDocumentId" TEXT, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerCredential_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "WorkerCredential_workerId_idx" ON "WorkerCredential" ("workerId");
CREATE INDEX IF NOT EXISTS "WorkerCredential_organisationId_expiresAt_idx" ON "WorkerCredential" ("organisationId","expiresAt");
-- <<< end: prisma/sql/credentials.sql

-- >>> inlined: prisma/sql/incidents.sql
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
-- <<< end: prisma/sql/incidents.sql

-- >>> inlined: prisma/sql/notifications_med_evv_billing.sql
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
-- <<< end: prisma/sql/notifications_med_evv_billing.sql

-- >>> inlined: prisma/sql/messaging.sql
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
-- <<< end: prisma/sql/messaging.sql

-- >>> inlined: prisma/sql/documents.sql
-- documents.sql — stored documents/files that feed the assistant + participant record
-- (provider/worker/admin attachments, third-party + personal uploads, photographed
-- docs OCR'd to text). See src/lib/document-actions.ts + docs/caira-assistant.md.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY (prisma/sql convention). Apply by hand after review:
--     psql "$DIRECT_URL" -f this file.
-- Net-new, additive. App degrades gracefully if absent (uploads report "not set up").

CREATE TABLE IF NOT EXISTS "Document" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "organisationId" TEXT,
    "participantId"  TEXT,
    "source"         TEXT NOT NULL,
    "title"          TEXT,
    "mimeType"       TEXT,
    "filePath"       TEXT,
    "extractedText"  TEXT,
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document" ("userId");
CREATE INDEX IF NOT EXISTS "Document_participantId_idx" ON "Document" ("participantId");
-- <<< end: prisma/sql/documents.sql

-- >>> inlined: prisma/sql/assistant.sql
-- assistant.sql — Caira assistant per-user context store + conversation history.
-- See src/lib/assistant-* and docs/caira-assistant.md.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY (prisma/sql convention). Apply by hand after review:
--     psql "$DIRECT_URL" -f this file.
-- Additive, net-new tables. The app degrades gracefully if absent (Caira answers from
-- general knowledge; remember/history are best-effort) until this is applied.

BEGIN;

CREATE TABLE IF NOT EXISTS "AssistantContext" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "organisationId" TEXT,
    "source"         TEXT NOT NULL,
    "title"          TEXT,
    "content"        TEXT NOT NULL,
    "participantId"  TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantContext_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssistantContext_userId_idx" ON "AssistantContext" ("userId");
CREATE INDEX IF NOT EXISTS "AssistantContext_participantId_idx" ON "AssistantContext" ("participantId");

CREATE TABLE IF NOT EXISTS "AssistantMessage" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "organisationId" TEXT,
    "role"           TEXT NOT NULL,
    "content"        TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssistantMessage_userId_createdAt_idx" ON "AssistantMessage" ("userId", "createdAt");

COMMIT;

-- RLS (apply alongside rls_policies.sql) — tenant + owner scoped:
--   ALTER TABLE "AssistantContext" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "AssistantMessage" ENABLE ROW LEVEL SECURITY;
--   (policies: owner userId = auth.uid() OR organisationId = jwt org claim)
-- <<< end: prisma/sql/assistant.sql

-- >>> inlined: prisma/sql/note_extraction.sql
-- note_extraction.sql — link AI-extracted log entries back to their source Note.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Adds LogEntry.derivedFromId (nullable): when a free-text Note is parsed into
-- structured entries (src/lib/note-extraction.ts + log-actions.ts), each extracted
-- entry points at the original Note (also a LogEntry, category='Note') for
-- provenance/audit. Null for entries captured directly via the chips.
--
-- Until this is applied, the extraction writer creates the entries UNLINKED (it
-- catches the "column does not exist" error and retries without the field), so the
-- feature works before the migration — it just can't record the parent link yet.

BEGIN;

ALTER TABLE "LogEntry" ADD COLUMN IF NOT EXISTS "derivedFromId" TEXT;
CREATE INDEX IF NOT EXISTS "LogEntry_derivedFromId_idx" ON "LogEntry" ("derivedFromId");

COMMIT;
-- <<< end: prisma/sql/note_extraction.sql

-- >>> inlined: prisma/sql/participant_care_profile.sql
-- participant_care_profile.sql — per-participant care profile (condition tags +
-- resolved support-need flags) that tailors capture chips. See src/lib/care-needs.ts
-- and docs/design/participant-care-profile.md.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Net-new table — additive, no data loss. Phase 1 doesn't read it on any hot path
-- (chip filtering is Phase 2), so applying it is not yet required for the app to run;
-- apply it before the editor/filtering phases land.

BEGIN;

CREATE TABLE IF NOT EXISTS "ParticipantCareProfile" (
    "id"             TEXT NOT NULL,
    "participantId"  TEXT NOT NULL,
    "conditions"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "supportNeeds"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "needConfig"     JSONB,
    "organisationId" TEXT,
    "updatedById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantCareProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParticipantCareProfile_participantId_key"
    ON "ParticipantCareProfile" ("participantId");
CREATE INDEX IF NOT EXISTS "ParticipantCareProfile_organisationId_idx"
    ON "ParticipantCareProfile" ("organisationId");

COMMIT;

-- RLS (apply alongside rls_policies.sql): tenant table — scope to the org claim.
--   ALTER TABLE "ParticipantCareProfile" ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON "ParticipantCareProfile" FOR ALL TO authenticated
--     USING ("organisationId" = (auth.jwt() ->> 'organisationId'))
--     WITH CHECK ("organisationId" = (auth.jwt() ->> 'organisationId'));
-- <<< end: prisma/sql/participant_care_profile.sql

-- >>> inlined: prisma/sql/org_auto_suggest_cap.sql
-- org_auto_suggest_cap.sql — admin-tunable cap on AUTOMATIC AI entry-prompt
-- suggestions per shift (manual taps are never capped). See src/lib/org-settings.ts.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY (prisma/sql convention). Apply by hand after review:
--     psql "$DIRECT_URL" -f this file.
--
-- Additive, no data loss: new column with a default, so existing rows backfill to 3.
-- getOrgAutoSuggestCap() tolerates the column's absence (falls back to 3), so the app
-- runs before this is applied; apply it to make the admin setting persist.

ALTER TABLE "Organisation"
  ADD COLUMN IF NOT EXISTS "autoSuggestCap" INTEGER NOT NULL DEFAULT 3;
-- <<< end: prisma/sql/org_auto_suggest_cap.sql

-- >>> inlined: prisma/sql/learned_options_per_org.sql
-- learned_options_per_org.sql — schema change for #7: per-org custom options on
-- top of shared global seeds, plus a read path for de-identified analytics.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. This is a design artifact, like the other files in
--     prisma/sql/. Apply it by hand on the laptop AFTER reviewing it, the same way
--     rls_policies.sql / search_vector.sql are applied (psql "$DIRECT_URL" -f …).
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Model recap (prisma/schema.prisma → LearnedOption):
--   • organisationId NULL  →  a GLOBAL row (curated seed, or a globally-promoted
--     option) shared by every tenant.
--   • organisationId SET   →  a row PRIVATE to that organisation (a word its own
--     workers typed that isn't a global seed yet).
--   • userId stays the owner's auth uid for org-scoped rows; NULL for globals.
--
-- The matching layer (src/lib/learned-options.ts) reads "global seeds + this org's
-- own options" and stamps new suggestions with the worker's organisationId. This
-- file makes the database enforce that model.

BEGIN;

-- 1) Uniqueness ------------------------------------------------------------------
-- The old constraint was global: one (kind, name) across the whole platform, which
-- stopped two different orgs from ever having the same custom word, and stopped a
-- per-org "Coffee" from coexisting with the global seed "Coffee".
--
-- Replace it with one unique row per (kind, name) *within each scope*: one global
-- row, plus at most one row per organisation. COALESCE folds NULL (global) into a
-- stable key so Postgres treats all global rows as one scope (a plain multi-column
-- UNIQUE would let unlimited NULL-org duplicates through, since NULL <> NULL).
DROP INDEX IF EXISTS "LearnedOption_kind_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "LearnedOption_kind_name_org_key"
  ON "LearnedOption" ("kind", "name", (COALESCE("organisationId", '')));

-- 2) Read path -------------------------------------------------------------------
-- The picker reads "approved, for this kind, global OR mine". Index that shape so
-- it stays fast as orgs accumulate their own options.
CREATE INDEX IF NOT EXISTS "LearnedOption_kind_status_org_idx"
  ON "LearnedOption" ("kind", "status", "organisationId");

-- 3) RLS -------------------------------------------------------------------------
-- LearnedOption is currently covered by the generic tenant_isolation loop in
-- rls_policies.sql, whose USING clause is (userId = me OR organisationId = my org).
-- That HIDES global seeds (organisationId IS NULL, userId IS NULL) from the
-- `authenticated` role. Globals are meant to be shared, so give LearnedOption its
-- own policy: everyone may READ global rows + their own org's rows; writes are
-- still tenant-scoped, and global rows are written only by the platform/service
-- role (which bypasses RLS), never by an authenticated client.
ALTER TABLE "LearnedOption" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LearnedOption";
DROP POLICY IF EXISTS learned_option_read ON "LearnedOption";
DROP POLICY IF EXISTS learned_option_write ON "LearnedOption";

-- Read: global seeds (org IS NULL) + your own org's options.
CREATE POLICY learned_option_read ON "LearnedOption"
  FOR SELECT TO authenticated
  USING (
    "organisationId" IS NULL
    OR "organisationId" = (auth.jwt() ->> 'organisationId')
  );

-- Write (INSERT/UPDATE/DELETE): only rows belonging to your own org — never a
-- global row, never another tenant's row. Global seeds/promotions are managed by
-- the service role out-of-band.
CREATE POLICY learned_option_write ON "LearnedOption"
  FOR ALL TO authenticated
  USING ("organisationId" = (auth.jwt() ->> 'organisationId'))
  WITH CHECK ("organisationId" = (auth.jwt() ->> 'organisationId'));

COMMIT;

-- 4) Prisma schema (apply alongside, by hand) ------------------------------------
-- Mirror the new uniqueness in prisma/schema.prisma so `prisma generate` and future
-- migrations agree with the database. The COALESCE expression index can't be
-- expressed as a plain @@unique, so keep it as raw SQL above and drop the old
-- @@unique([kind, name]) from the model (replace with @@index hints only):
--
--   model LearnedOption {
--     …
--     @@index([kind, status, organisationId])
--     // unique (kind, name, coalesce(organisationId,'')) enforced via raw SQL —
--     // see prisma/sql/learned_options_per_org.sql
--   }
-- <<< end: prisma/sql/learned_options_per_org.sql

-- >>> inlined: prisma/sql/feature_tables_rls.sql
-- feature_tables_rls.sql — post-apply RLS sweep for the Phase-0 feature tables.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Apply by hand AFTER the feature DDL:
--       psql "$DIRECT_URL" -f prisma/sql/feature_tables_rls.sql
--     (apply_all_features.sql already includes it as the final step). Re-runnable.
--
-- Why: the feature DDL files (care_tasks/credentials/incidents/
-- notifications_med_evv_billing/messaging/documents) create tenant tables but do
-- NOT enable RLS. Under Option A the app reaches Postgres via the privileged Prisma
-- role and BYPASSES RLS, so these policies don't touch the app — they lock the
-- public Data API (PostgREST via the anon/authenticated key) so a leaked anon key
-- can't read one tenant's care tasks, meds, incidents, messages, etc.
--
-- Deny-by-default + tenant isolation, matching rls_policies.sql / _v2.sql. The
-- predicate is built PER TABLE from whichever of "userId" / "organisationId" the
-- table actually has (these tables vary: most carry only "organisationId"; a few
-- also carry "userId"). assistant.sql, participant_care_profile.sql and
-- rbac_grants.sql ship their own RLS, so they are intentionally NOT swept here.

BEGIN;

DO $$
DECLARE
  t           text;
  has_user    boolean;
  has_org     boolean;
  predicate   text;
  reassign    text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- care_tasks.sql
    'CareTask','ShiftTaskCompletion',
    -- credentials.sql
    'WorkerCredential',
    -- incidents.sql
    'Incident',
    -- notifications_med_evv_billing.sql
    'Notification','Medication','MedicationAdministration',
    'VisitVerification','ParticipantBudget','BillableItem',
    -- messaging.sql
    'Message','ShiftHandover',
    -- rbac_grants.sql + participant_care_profile.sql ship their tenant_isolation
    -- only as COMMENTED-OUT SQL, so RLS is actually off on these — sweep them too.
    'Membership','ParticipantAccessGrant','Consent','ParticipantCareProfile'
    -- NOTE: Document, Notification, AssistantContext and AssistantMessage are
    -- already covered by rls_policies_v2.sql; LearnedOption by its own file.
  ] LOOP
    -- The table may not exist if its DDL file wasn't applied; skip rather than fail.
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'feature_tables_rls: skipping % (not present)', t;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'userId'
    ) INTO has_user;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisationId'
    ) INTO has_org;

    -- Build the isolation predicate from the columns the table actually has.
    -- own row (userId = auth.uid()) OR same org (signed org claim).
    predicate := '';
    IF has_user THEN
      predicate := '"userId" = (select auth.uid())::text';
    END IF;
    IF has_org THEN
      IF predicate <> '' THEN predicate := predicate || ' OR '; END IF;
      predicate := predicate || '"organisationId" = (auth.jwt() ->> ''organisationId'')';
    END IF;

    -- No tenant column at all → deny-by-default (enable RLS, no permissive policy).
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    IF predicate = '' THEN
      RAISE NOTICE 'feature_tables_rls: % has no userId/organisationId — deny-by-default', t;
      CONTINUE;
    END IF;

    -- WITH CHECK also forbids planting/reassigning a row into another tenant, even
    -- on a row you "own" — identical guard to rls_policies.sql. The reassign guard
    -- only applies when the table actually has an "organisationId" column.
    reassign := '';
    IF has_org THEN
      reassign := ' AND ("organisationId" IS NULL'
        || ' OR "organisationId" = (auth.jwt() ->> ''organisationId''))';
    END IF;

    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO authenticated
      USING ( %s )
      WITH CHECK ( ( %s )%s );
    $f$, t, predicate, predicate, reassign);
  END LOOP;
END $$;

COMMIT;
-- <<< end: prisma/sql/feature_tables_rls.sql

-- <<< end: prisma/sql/apply_all_features.sql

-- >>> inlined: prisma/sql/caira_ai.sql
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
-- <<< end: prisma/sql/caira_ai.sql

-- >>> inlined: prisma/sql/org_caira_enabled.sql
-- org_caira_enabled.sql — admin-tunable, org-wide on/off switch for the Caira
-- character system (nav logo, assistant + recording overlays, character-driven
-- empty/loading/error states). See src/lib/org-settings.ts.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY (prisma/sql convention). Apply by hand after review:
--     psql "$DIRECT_URL" -f this file.
--
-- Additive, no data loss: new column with a default, so existing rows backfill to
-- true. getOrgCairaEnabled() tolerates the column's absence (falls back to true), so
-- the app runs before this is applied; apply it to make the admin setting persist.

ALTER TABLE "Organisation"
  ADD COLUMN IF NOT EXISTS "cairaEnabled" BOOLEAN NOT NULL DEFAULT true;
-- <<< end: prisma/sql/org_caira_enabled.sql

-- >>> inlined: prisma/sql/caira_flag_rls.sql
-- CairaFlag tenant isolation. Matches rls_policies_v2.sql; idempotent.
ALTER TABLE "CairaFlag" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CairaFlag";
CREATE POLICY tenant_isolation ON "CairaFlag"
  FOR ALL TO authenticated
  USING ( "organisationId" = (auth.jwt() ->> 'organisationId') )
  WITH CHECK ( "organisationId" = (auth.jwt() ->> 'organisationId') );
-- <<< end: prisma/sql/caira_flag_rls.sql

-- >>> inlined: prisma/sql/participant_ndis_erasure.sql
-- participant_ndis_erasure.sql — adds the NDIS plan/profile fields the coordinator
-- console edits, plus the right-to-erasure (de-identification) tombstones that
-- src/lib/anonymise.ts + participant-erasure-actions.ts write. See also schema_baseline.sql.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql/ files.
--     Apply by hand on the laptop after review:  psql "$DIRECT_URL" -f this file.
--     Do NOT run `prisma db push` / `--force-reset` against the live DB.
--
-- Purely additive (ADD COLUMN IF NOT EXISTS on an existing table) — no data loss,
-- safe to re-run. The app tolerates these columns being absent on read paths, but
-- the erasure WRITE (anonymiseParticipant) needs them applied to succeed.

BEGIN;

ALTER TABLE "Participant"
    ADD COLUMN IF NOT EXISTS "preferredName" TEXT,
    ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "pronouns" TEXT,
    ADD COLUMN IF NOT EXISTS "primaryDisability" TEXT,
    ADD COLUMN IF NOT EXISTS "communicationNeeds" TEXT,
    ADD COLUMN IF NOT EXISTS "culturalNeeds" TEXT,
    ADD COLUMN IF NOT EXISTS "address" TEXT,
    ADD COLUMN IF NOT EXISTS "phone" TEXT,
    ADD COLUMN IF NOT EXISTS "email" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "emergencyContactRelation" TEXT,
    ADD COLUMN IF NOT EXISTS "gpName" TEXT,
    ADD COLUMN IF NOT EXISTS "gpPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "ndisPlanStart" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "ndisPlanEnd" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "planManagementType" TEXT,
    ADD COLUMN IF NOT EXISTS "planManagerName" TEXT,
    ADD COLUMN IF NOT EXISTS "planManagerContact" TEXT,
    ADD COLUMN IF NOT EXISTS "supportCoordinator" TEXT,
    ADD COLUMN IF NOT EXISTS "anonymisedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

COMMIT;

-- No RLS change needed: "Participant" already has its tenant policy from
-- rls_policies.sql (these columns inherit it). The Prisma app role bypasses RLS and
-- scopes by tenant in code (tenantScope) — see participant-erasure-actions.ts.
-- <<< end: prisma/sql/participant_ndis_erasure.sql

-- >>> inlined: prisma/sql/ndis_price_guide.sql
-- ndis_price_guide.sql — Phase 2 (budgets/claims): the NDIS Support Catalogue
-- (price guide) reference table. Matches prisma/schema.prisma → NdisSupportItem.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql files.
--     Apply by hand on the laptop AFTER review (psql "$DIRECT_URL" -f …), the same
--     way rls_policies.sql / learned_options_per_org.sql are applied. Do NOT run
--     `prisma db push` / `--force-reset` against the live DB.
--
-- This is NATIONAL REFERENCE DATA, not participant data — creating + loading it is
-- NOT gated by the legal/real-data gate (no PII). Load it from the NDIA "Support
-- Catalogue" CSV via src/lib/price-guide.ts (parsePriceGuideCsv → upsert by code).
--
-- Scope model (mirrors LearnedOption):
--   • organisationId NULL  → a GLOBAL price-guide row, shared by every tenant.
--   • organisationId SET   → an org-PRIVATE override (negotiated/quote price).
--   • userId stays the owner's auth uid for org rows; NULL for globals.

BEGIN;

CREATE TABLE IF NOT EXISTS "NdisSupportItem" (
  "id"                   TEXT PRIMARY KEY,
  "code"                 TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "registrationGroup"    TEXT,
  "supportCategory"      TEXT,
  "unit"                 TEXT,
  "typeOfSupport"        TEXT,
  "quote"                BOOLEAN NOT NULL DEFAULT false,
  "capActNswQldVicCents" INTEGER,
  "capNtSaTasWaCents"    INTEGER,
  "capRemoteCents"       INTEGER,
  "capVeryRemoteCents"   INTEGER,
  "capNationalCents"     INTEGER,
  "priceGuideVersion"    TEXT,
  "userId"               TEXT,
  "organisationId"       TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- One global row per code, plus at most one override per (code, org). COALESCE
-- folds NULL (global) into a stable key so all globals share one scope (a plain
-- multi-column UNIQUE would allow unlimited NULL-org duplicates, since NULL<>NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "NdisSupportItem_code_org_key"
  ON "NdisSupportItem" ("code", (COALESCE("organisationId", '')));

CREATE INDEX IF NOT EXISTS "NdisSupportItem_code_idx"
  ON "NdisSupportItem" ("code");

-- RLS: the price guide is world-readable reference data (like global LearnedOption
-- seeds — the app reads via Prisma, which bypasses RLS, but the Data API must not
-- leak/allow writes). Enable RLS and grant SELECT on global rows + this org's own
-- override rows; deny writes from the Data API (app writes the catalogue via Prisma).
ALTER TABLE "NdisSupportItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ndis_price_guide_read" ON "NdisSupportItem";
CREATE POLICY "ndis_price_guide_read" ON "NdisSupportItem"
  FOR SELECT
  USING (
    "organisationId" IS NULL
    OR "organisationId" = (current_setting('request.jwt.claims', true)::json ->> 'organisationId')
  );

COMMIT;

-- Reminder: add "NdisSupportItem" to prisma/sql/schema_baseline.sql and re-run
-- verify_rls.sql after applying, so the all-tables-have-RLS regression guard passes.
-- <<< end: prisma/sql/ndis_price_guide.sql

-- DONE. Then run prisma/sql/verify_rls_editor.sql in the Supabase SQL editor (expect every public table RLS-enabled).
