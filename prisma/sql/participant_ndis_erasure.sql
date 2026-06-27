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
