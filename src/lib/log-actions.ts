// log-actions.ts — the shift tracker's two server actions: add a log entry, and
// remove one you tapped by mistake.
//
// These power task 1f: during a shift, a worker taps a chip (Meal, Fluids, …),
// optionally types a note, and it lands on the live timeline.
//
// Same house rules as the other *-actions files:
//   • "use server" — these run on the server, never in the browser.
//   • Each action re-checks who's calling and whether they're allowed to do this
//     (a form on the page is never trusted on its own).
//   • A worker only logs against their OWN shift, and only while it's running.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { isLogCategory } from "@/lib/log-categories";
import { revalidatePath } from "next/cache";

// Add one entry to a shift's log. Allowed only on the caller's own shift while
// it's IN_PROGRESS (you log while you're there, not before or after).
export async function addLogEntry(formData: FormData) {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  const category = String(formData.get("category") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!worker || !shiftId) return;

  // Only categories we actually offer (guards against a tampered form).
  if (!isLogCategory(category)) return;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // Must be this worker's own shift, and currently being worked.
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "IN_PROGRESS") return;

  await prisma.logEntry.create({
    data: {
      shiftId,
      category,
      notes,
      // `timestamp` = when it happened. For live capture that's now; the server
      // clock is the source of truth (same as clock on/off).
      timestamp: new Date(),
    },
  });

  revalidatePath(`/shift/${shiftId}`);
}

// Remove a log entry the worker added by mistake. Still only their own shift,
// still only while it's IN_PROGRESS — once the shift is done the log is locked.
export async function deleteLogEntry(formData: FormData) {
  const worker = await getCurrentWorker();
  const entryId = String(formData.get("entryId") ?? "");
  if (!worker || !entryId) return;

  // Load the entry together with its shift so we can check ownership.
  const entry = await prisma.logEntry.findUnique({
    where: { id: entryId },
    include: { shift: true },
  });
  if (!entry) return;
  if (entry.shift.allocatedToId !== worker.id || entry.shift.status !== "IN_PROGRESS") return;

  await prisma.logEntry.delete({ where: { id: entryId } });

  revalidatePath(`/shift/${entry.shiftId}`);
}
