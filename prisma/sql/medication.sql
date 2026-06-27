-- medication.sql — Phase-H medication authorisation + visual-verification backend
-- (docs/MED_VERIFICATION_SPEC.md). LEGAL-GATED, DUMMY DATA ONLY.
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand (Supabase SQL editor / psql): this
--    file is idempotent and re-runnable. NEVER `prisma db push`.
--
-- Adds, all additive:
--   • "Medication".authStatus (DRAFT→PENDING_BSP→PENDING_COMMISSION→PENDING_GUARDIAN
--     →ACTIVE / DECLINED) + isChemicalRestraint, with a TRIGGER that enforces the
--     legal transitions at the DB level (the spec's hard gate — a direct write can't
--     skip a stage even if it bypasses the app). Mirrors src/lib/med-authorisation.ts.
--   • Verification columns on "MedicationAdministration" (the MAR): in-app photo,
--     AI decision-support result, human outcome, RP-incident link — and makes the
--     table IMMUTABLE (append-only: UPDATE/DELETE blocked).
--   • Two new tables: "PillAppearanceProfile" (structured appearance for the visual
--     check) and "MedAuthEvent" (the immutable per-stage authorisation chain), each
--     with the standard org tenant_isolation RLS policy (Rule 5/10).

BEGIN;

-- ── Medication: authorisation gate columns ────────────────────────────────────────
ALTER TABLE "Medication"
  ADD COLUMN IF NOT EXISTS "authStatus"          TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "isChemicalRestraint" BOOLEAN NOT NULL DEFAULT false;

-- Constrain to the known statuses (defence-in-depth alongside the transition trigger).
ALTER TABLE "Medication" DROP CONSTRAINT IF EXISTS "Medication_authStatus_check";
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_authStatus_check"
  CHECK ("authStatus" IN ('DRAFT','PENDING_BSP','PENDING_COMMISSION','PENDING_GUARDIAN','ACTIVE','DECLINED'));

CREATE INDEX IF NOT EXISTS "Medication_participantId_authStatus_idx"
  ON "Medication" ("participantId","authStatus");

-- ── MedicationAdministration: verification + outcome columns ───────────────────────
ALTER TABLE "MedicationAdministration"
  ADD COLUMN IF NOT EXISTS "photoPath"      TEXT,
  ADD COLUMN IF NOT EXISTS "aiMatch"        BOOLEAN,
  ADD COLUMN IF NOT EXISTS "aiConfidence"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "aiReasoning"    TEXT,
  ADD COLUMN IF NOT EXISTS "aiObserved"     TEXT,
  ADD COLUMN IF NOT EXISTS "outcome"        TEXT,
  ADD COLUMN IF NOT EXISTS "overrideReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rpIncidentId"   TEXT;

-- ── New tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PillAppearanceProfile" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "colour" TEXT,
    "shape" TEXT,
    "size" TEXT,
    "markings" TEXT,
    "features" TEXT,
    "referencePhotoPath" TEXT,
    "source" TEXT NOT NULL DEFAULT 'INTERNAL',
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PillAppearanceProfile_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "PillAppearanceProfile_medicationId_key"
  ON "PillAppearanceProfile" ("medicationId");

CREATE TABLE IF NOT EXISTS "MedAuthEvent" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "approverId" TEXT,
    "approverRole" TEXT,
    "referenceNumber" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedAuthEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MedAuthEvent_medicationId_occurredAt_idx"
  ON "MedAuthEvent" ("medicationId","occurredAt");

-- ── Hard gate: enforce the authorisation state machine at the DB level ─────────────
-- A direct UPDATE that tries to skip a stage (or move backwards / out of DECLINED)
-- is rejected. Legal steps mirror src/lib/med-authorisation.ts exactly:
--   DRAFT → PENDING_BSP → PENDING_COMMISSION → PENDING_GUARDIAN → ACTIVE
--   <any live stage> → DECLINED (terminal). A no-op (same value) is allowed.
CREATE OR REPLACE FUNCTION "enforce_med_auth_transition"() RETURNS trigger AS $fn$
BEGIN
  IF NEW."authStatus" = OLD."authStatus" THEN
    RETURN NEW; -- no-op
  END IF;
  IF OLD."authStatus" = 'DECLINED' THEN
    RAISE EXCEPTION 'Medication % authStatus is terminal (DECLINED) and cannot change', OLD."id";
  END IF;
  IF NEW."authStatus" = 'DECLINED' THEN
    RETURN NEW; -- any live record may be declined
  END IF;
  IF (OLD."authStatus" = 'DRAFT'              AND NEW."authStatus" = 'PENDING_BSP')
  OR (OLD."authStatus" = 'PENDING_BSP'        AND NEW."authStatus" = 'PENDING_COMMISSION')
  OR (OLD."authStatus" = 'PENDING_COMMISSION' AND NEW."authStatus" = 'PENDING_GUARDIAN')
  OR (OLD."authStatus" = 'PENDING_GUARDIAN'   AND NEW."authStatus" = 'ACTIVE') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Illegal medication authStatus transition: % -> %', OLD."authStatus", NEW."authStatus";
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "med_auth_transition_guard" ON "Medication";
CREATE TRIGGER "med_auth_transition_guard"
  BEFORE UPDATE OF "authStatus" ON "Medication"
  FOR EACH ROW
  WHEN (OLD."authStatus" IS DISTINCT FROM NEW."authStatus")
  EXECUTE FUNCTION "enforce_med_auth_transition"();

-- ── Immutability: MAR + authorisation chain are append-only (spec §4/§5) ───────────
CREATE OR REPLACE FUNCTION "block_row_mutation"() RETURNS trigger AS $fn$
BEGIN
  RAISE EXCEPTION '% rows are immutable (append-only) — % is not permitted', TG_TABLE_NAME, TG_OP;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "medadmin_immutable" ON "MedicationAdministration";
CREATE TRIGGER "medadmin_immutable"
  BEFORE UPDATE OR DELETE ON "MedicationAdministration"
  FOR EACH ROW EXECUTE FUNCTION "block_row_mutation"();

DROP TRIGGER IF EXISTS "medauthevent_immutable" ON "MedAuthEvent";
CREATE TRIGGER "medauthevent_immutable"
  BEFORE UPDATE OR DELETE ON "MedAuthEvent"
  FOR EACH ROW EXECUTE FUNCTION "block_row_mutation"();

-- ── RLS: standard org tenant_isolation on the two new tables (Rule 5/10) ───────────
-- Matches hub.sql / feature_tables_rls.sql. The app reaches Postgres via the
-- privileged Prisma role (Option A) and BYPASSES RLS; these lock the public Data API.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['PillAppearanceProfile','MedAuthEvent'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO authenticated
      USING (
        "userId" = (select auth.uid())::text
        OR "organisationId" = (auth.jwt() ->> 'organisationId')
      )
      WITH CHECK (
        (
          "userId" = (select auth.uid())::text
          OR "organisationId" = (auth.jwt() ->> 'organisationId')
        )
        AND (
          "organisationId" IS NULL
          OR "organisationId" = (auth.jwt() ->> 'organisationId')
        )
      );
    $f$, t);
  END LOOP;
END $$;

COMMIT;

-- Dry-run note: review with `BEGIN; \i prisma/sql/medication.sql; ROLLBACK;` before COMMIT.
