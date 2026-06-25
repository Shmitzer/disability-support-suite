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
