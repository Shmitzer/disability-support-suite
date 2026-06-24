-- search_vector.sql — Postgres full-text search for shift reports (Phase D).
-- Prisma does not manage tsvector columns/triggers, so this lives as checked-in
-- SQL and is applied AFTER `prisma migrate deploy` against Postgres/Supabase.
-- Re-runnable (idempotent).

ALTER TABLE "ShiftReport" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION shiftreport_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."summary", '')),   'A') ||
    setweight(to_tsvector('english', coalesce(NEW."sourceLog", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shiftreport_search_vector_trg ON "ShiftReport";
CREATE TRIGGER shiftreport_search_vector_trg
  BEFORE INSERT OR UPDATE OF "summary", "sourceLog" ON "ShiftReport"
  FOR EACH ROW EXECUTE FUNCTION shiftreport_search_vector();

CREATE INDEX IF NOT EXISTS "ShiftReport_searchVector_idx"
  ON "ShiftReport" USING GIN ("searchVector");

-- Backfill existing rows (the UPDATE fires the trigger).
UPDATE "ShiftReport" SET "summary" = "summary";
