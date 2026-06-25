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
