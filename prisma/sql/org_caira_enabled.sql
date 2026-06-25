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
