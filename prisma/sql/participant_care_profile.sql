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
