-- backfill_tenant.sql — populate userId/organisationId on rows created BEFORE the
-- app started stamping them (Phase E, step 2). Idempotent (only fills NULLs).
--
-- WHEN YOU NEED THIS: only if you already have a Postgres database with data whose
-- userId is NULL, and you're about to make userId NOT NULL. A FRESH cutover does
-- NOT need it — `prisma migrate` creates the tables NOT NULL and the seed/app now
-- populate userId on every insert.
--
-- userId must hold the owner's Supabase auth UID (what RLS compares to auth.uid()).
-- We derive it from the obvious owning relation, preferring Worker.supabaseUserId
-- and falling back to the Worker id for pre-auth rows.

-- Shifts: owner = the allocated worker, else the creator.
UPDATE "Shift" s
SET "userId" = COALESCE(
      (SELECT COALESCE(w."supabaseUserId", w."id") FROM "Worker" w WHERE w."id" = s."allocatedToId"),
      (SELECT COALESCE(w."supabaseUserId", w."id") FROM "Worker" w WHERE w."id" = s."createdById")
    )
WHERE s."userId" IS NULL;

-- Shift children inherit the shift's owner (and org).
UPDATE "ShiftEvent" e
SET "userId" = COALESCE(
      (SELECT COALESCE(w."supabaseUserId", w."id") FROM "Worker" w WHERE w."id" = e."actorId"),
      (SELECT s."userId" FROM "Shift" s WHERE s."id" = e."shiftId")
    ),
    "organisationId" = COALESCE(e."organisationId", (SELECT s."organisationId" FROM "Shift" s WHERE s."id" = e."shiftId"))
WHERE e."userId" IS NULL;

UPDATE "LogEntry" l
SET "userId" = (SELECT s."userId" FROM "Shift" s WHERE s."id" = l."shiftId"),
    "organisationId" = COALESCE(l."organisationId", (SELECT s."organisationId" FROM "Shift" s WHERE s."id" = l."shiftId"))
WHERE l."userId" IS NULL;

UPDATE "ShiftReport" r
SET "userId" = (SELECT s."userId" FROM "Shift" s WHERE s."id" = r."shiftId"),
    "organisationId" = COALESCE(r."organisationId", (SELECT s."organisationId" FROM "Shift" s WHERE s."id" = r."shiftId"))
WHERE r."userId" IS NULL;

UPDATE "ClockAmendmentRequest" c
SET "userId" = COALESCE(
      (SELECT COALESCE(w."supabaseUserId", w."id") FROM "Worker" w WHERE w."id" = c."requestedById"),
      (SELECT s."userId" FROM "Shift" s WHERE s."id" = c."shiftId")
    ),
    "organisationId" = COALESCE(c."organisationId", (SELECT s."organisationId" FROM "Shift" s WHERE s."id" = c."shiftId"))
WHERE c."userId" IS NULL;

-- Worker↔participant links: owner = the worker in the link.
UPDATE "WorkerParticipant" wp
SET "userId" = (SELECT COALESCE(w."supabaseUserId", w."id") FROM "Worker" w WHERE w."id" = wp."workerId")
WHERE wp."userId" IS NULL;

-- Org-owned tables with no single owner column (Participant, ProgressNote): there
-- is no relation to derive an owner from. Choose an owner explicitly — e.g. the
-- org's admin — by setting <ADMIN_UID> before running, OR leave these nullable.
-- UPDATE "Participant"  SET "userId" = '<ADMIN_UID>' WHERE "userId" IS NULL;
-- UPDATE "ProgressNote" SET "userId" = '<ADMIN_UID>' WHERE "userId" IS NULL;

-- After this resolves to zero NULLs, the NOT NULL migration is safe to apply.
-- Check:  SELECT count(*) FROM "Shift" WHERE "userId" IS NULL;  -- expect 0
