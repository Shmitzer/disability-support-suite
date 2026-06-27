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
