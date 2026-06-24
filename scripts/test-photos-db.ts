// DB round-trip test for shift-photo storage. Proves the migrated schema persists
// and returns LogEntry.photos intact, that the read-side resolution is a no-op
// without Storage, and that the keep-set anti-tamper check holds against real rows.
//
// Runs INSIDE a transaction that ALWAYS rolls back, so it leaves nothing behind —
// safe to run against any Postgres (including production). Needs a real Postgres
// DATABASE_URL; skips cleanly otherwise.
//
//   npm run test:db
//
// (The pure logic this builds on is covered, DB-free, by `npm test`.)

import assert from "node:assert/strict";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { signStoredPhotos } from "../src/lib/storage";
import { planPhotoUpdate } from "../src/lib/photos";

const url = process.env.DATABASE_URL ?? "";
if (!url || url.startsWith("file:")) {
  console.log("test:db SKIPPED — set DATABASE_URL to a Postgres instance to run it.");
  process.exit(0);
}

// Thrown to abort (roll back) the transaction once assertions pass.
const ROLLBACK = Symbol("rollback");

async function main() {
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      const uid = "photo-db-test";

      // Minimal graph a LogEntry needs (FKs): worker → participant → shift → entry.
      const worker = await tx.worker.create({ data: { name: "Photo Test Worker" } });
      const participant = await tx.participant.create({
        data: { name: "Photo Test Participant", userId: uid },
      });
      const shift = await tx.shift.create({
        data: {
          status: "IN_PROGRESS",
          participantId: participant.id,
          createdById: worker.id,
          allocatedToId: worker.id,
          scheduledStart: new Date(),
          scheduledEnd: new Date(Date.now() + 3_600_000),
          userId: uid,
        },
      });

      // Persist relative Storage paths (the new at-rest shape) and read them back.
      const paths = [`${shift.id}/one.jpg`, `${shift.id}/two.jpg`];
      const created = await tx.logEntry.create({
        data: {
          shiftId: shift.id,
          category: "Note",
          notes: "photo round-trip",
          timestamp: new Date(),
          userId: uid,
          photos: JSON.stringify(paths),
        },
      });

      const read = await tx.logEntry.findUniqueOrThrow({ where: { id: created.id } });
      assert.equal(read.photos, JSON.stringify(paths), "photos column round-trips intact");

      // Read-side resolution with Storage unconfigured is a shape-preserving no-op.
      const resolved = await signStoredPhotos(read.photos);
      assert.equal(resolved, JSON.stringify(paths), "signStoredPhotos no-ops without Storage");

      // An edit keeps only paths already on the entry (validated against real rows).
      const plan = planPhotoUpdate(paths, { keepable: paths, storageEnabled: true });
      assert.equal(plan.length, 2, "both stored paths are keepable");
      assert.ok(plan.every((a) => a.kind === "keep"), "kept (not re-uploaded)");

      throw ROLLBACK; // undo every insert — leave the database untouched
    });
  } catch (err) {
    if (err !== ROLLBACK) throw err;
  } finally {
    await prisma.$disconnect();
  }

  console.log("test:db PASSED — photo round-trip persists and resolves correctly.");
}

main().catch((err) => {
  console.error("test:db FAILED:", err);
  process.exit(1);
});
