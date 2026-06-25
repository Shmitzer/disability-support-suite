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
