-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShiftReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceLog" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "questions" TEXT,
    "clarifications" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftReport_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShiftReport" ("createdAt", "id", "model", "shiftId", "sourceLog", "summary") SELECT "createdAt", "id", "model", "shiftId", "sourceLog", "summary" FROM "ShiftReport";
DROP TABLE "ShiftReport";
ALTER TABLE "new_ShiftReport" RENAME TO "ShiftReport";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
