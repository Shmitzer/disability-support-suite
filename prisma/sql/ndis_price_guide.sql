-- ndis_price_guide.sql — Phase 2 (budgets/claims): the NDIS Support Catalogue
-- (price guide) reference table. Matches prisma/schema.prisma → NdisSupportItem.
--
-- ⚠️  NOT APPLIED AUTOMATICALLY. Design artifact, like the other prisma/sql files.
--     Apply by hand on the laptop AFTER review (psql "$DIRECT_URL" -f …), the same
--     way rls_policies.sql / learned_options_per_org.sql are applied. Do NOT run
--     `prisma db push` / `--force-reset` against the live DB.
--
-- This is NATIONAL REFERENCE DATA, not participant data — creating + loading it is
-- NOT gated by the legal/real-data gate (no PII). Load it from the NDIA "Support
-- Catalogue" CSV via src/lib/price-guide.ts (parsePriceGuideCsv → upsert by code).
--
-- Scope model (mirrors LearnedOption):
--   • organisationId NULL  → a GLOBAL price-guide row, shared by every tenant.
--   • organisationId SET   → an org-PRIVATE override (negotiated/quote price).
--   • userId stays the owner's auth uid for org rows; NULL for globals.

BEGIN;

CREATE TABLE IF NOT EXISTS "NdisSupportItem" (
  "id"                   TEXT PRIMARY KEY,
  "code"                 TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "registrationGroup"    TEXT,
  "supportCategory"      TEXT,
  "unit"                 TEXT,
  "typeOfSupport"        TEXT,
  "quote"                BOOLEAN NOT NULL DEFAULT false,
  "capActNswQldVicCents" INTEGER,
  "capNtSaTasWaCents"    INTEGER,
  "capRemoteCents"       INTEGER,
  "capVeryRemoteCents"   INTEGER,
  "capNationalCents"     INTEGER,
  "priceGuideVersion"    TEXT,
  "userId"               TEXT,
  "organisationId"       TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- One global row per code, plus at most one override per (code, org). COALESCE
-- folds NULL (global) into a stable key so all globals share one scope (a plain
-- multi-column UNIQUE would allow unlimited NULL-org duplicates, since NULL<>NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "NdisSupportItem_code_org_key"
  ON "NdisSupportItem" ("code", (COALESCE("organisationId", '')));

CREATE INDEX IF NOT EXISTS "NdisSupportItem_code_idx"
  ON "NdisSupportItem" ("code");

-- RLS: the price guide is world-readable reference data (like global LearnedOption
-- seeds — the app reads via Prisma, which bypasses RLS, but the Data API must not
-- leak/allow writes). Enable RLS and grant SELECT on global rows + this org's own
-- override rows; deny writes from the Data API (app writes the catalogue via Prisma).
ALTER TABLE "NdisSupportItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ndis_price_guide_read" ON "NdisSupportItem";
CREATE POLICY "ndis_price_guide_read" ON "NdisSupportItem"
  FOR SELECT
  USING (
    "organisationId" IS NULL
    OR "organisationId" = (current_setting('request.jwt.claims', true)::json ->> 'organisationId')
  );

COMMIT;

-- Reminder: add "NdisSupportItem" to prisma/sql/schema_baseline.sql and re-run
-- verify_rls.sql after applying, so the all-tables-have-RLS regression guard passes.
