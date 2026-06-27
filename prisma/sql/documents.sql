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
