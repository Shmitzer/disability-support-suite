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
