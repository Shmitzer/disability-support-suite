-- restrictive_practice.sql — RP extension of "Incident" (HUB_DATA_MODEL.md §RP).
-- ⚠️ NOT APPLIED AUTOMATICALLY. Apply by hand; idempotent + re-runnable. NEVER `db push`.
--
-- Promotes restrictive-practice (RP) use to a first-class, compliant Incident: the
-- most regulated NDIS area. An unauthorised/emergency use (rpAuthorised=false) is a
-- reportable incident to the NDIS Commission — src/lib/incident-actions.ts derives
-- reportable=true from that. Chemical restraint cross-references the eMAR via
-- medicationAdminId so the same dose isn't double-recorded. All additive/nullable;
-- existing incidents default to restrictivePractice=false (an ordinary incident).

BEGIN;

ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "restrictivePractice"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rpType"               TEXT,    -- PHYSICAL | CHEMICAL | MECHANICAL | ENVIRONMENTAL | SECLUSION
  ADD COLUMN IF NOT EXISTS "rpAuthorised"         BOOLEAN, -- true = under current BSP; false = unauthorised/emergency → reportable
  ADD COLUMN IF NOT EXISTS "rpRoutineOrPrn"       TEXT,    -- ROUTINE | PRN
  ADD COLUMN IF NOT EXISTS "rpMedication"         TEXT,    -- chemical restraint: drug
  ADD COLUMN IF NOT EXISTS "rpDose"               TEXT,    -- chemical restraint: dose
  ADD COLUMN IF NOT EXISTS "rpDurationMinutes"    INTEGER, -- physical restraint / seclusion duration
  ADD COLUMN IF NOT EXISTS "lessRestrictiveTried" TEXT,    -- least-restrictive evidence (what was tried first)
  ADD COLUMN IF NOT EXISTS "bspReference"         TEXT,    -- the BSP authorising it
  ADD COLUMN IF NOT EXISTS "medicationAdminId"    TEXT;    -- links chemical restraint to MedicationAdministration (eMAR)

COMMIT;
