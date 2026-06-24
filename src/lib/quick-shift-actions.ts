// quick-shift-actions.ts — "Start a quick shift": let a worker begin logging
// immediately, without waiting for a manager to roster and allocate a shift.
//
// This is what makes the in-shift note-taker usable as standalone software:
// tap "Start a quick shift" → this creates a shift that is already yours and
// already running (IN_PROGRESS, clocked on now) → you land on /shift/[id] and
// can log straight away.
//
// House rules (same as the other *-actions files):
//   • "use server" — this runs on the server only, never in the browser.
//   • Re-check the caller (a form on the page is never trusted on its own).
//   • Every shift change writes to the append-only ShiftEvent audit log.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner, tenantScope } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// A quick shift's nominal length. The real start/end come from clock on/off;
// these scheduled times are just sensible placeholders (the schema requires
// them, and the manager flow normally supplies them).
const QUICK_SHIFT_HOURS = 8;

// Start a quick shift for the current worker and drop them onto its tracker.
//
// Input (FormData):
//   • participantName — optional free text. If given, we find-or-create a
//     participant with this name (so you can try different names while testing).
//   • participantId   — optional; the chosen seeded participant. Used only when
//     no free-text name was typed.
// At least one must resolve to a participant, or we do nothing.
//
// Output: redirects to /shift/<newId>. redirect() throws a framework control-
// flow exception, so it must be the LAST thing we do and must NOT sit inside a
// try/catch (that would swallow the redirect).
export async function startQuickShift(formData: FormData) {
  const worker = await getCurrentWorker();
  if (!worker) return;

  const typedName = String(formData.get("participantName") ?? "").trim();
  const pickedId = String(formData.get("participantId") ?? "");

  // Work out which participant this shift is for.
  let participantId: string | null = null;

  if (typedName) {
    // Free text wins. Find an existing participant with this exact name, or
    // create one. (name isn't unique in the schema, so we use findFirst here,
    // not a unique upsert.)
    const existing = await prisma.participant.findFirst({
      where: { name: typedName, ...tenantScope(worker) },
    });
    participantId = existing
      ? existing.id
      : (await prisma.participant.create({ data: { name: typedName, ...tenantOwner(worker) } })).id;
  } else if (pickedId) {
    // Otherwise use the dropdown choice — but confirm it's one of THIS tenant's.
    const picked = await prisma.participant.findFirst({
      where: { id: pickedId, ...tenantScope(worker) },
    });
    participantId = picked?.id ?? null;
  }

  if (!participantId) return; // nothing typed and nothing chosen — do nothing

  // Idempotency (Rule 12): a double-submit (double tap / back-forward) carries the
  // same client key, so it lands on the SAME shift instead of creating duplicates.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "") || null;
  if (idempotencyKey) {
    const existing = await prisma.shift.findUnique({ where: { idempotencyKey } });
    if (existing) redirect(`/shift/${existing.id}`); // same submit again — same shift
  }

  const now = new Date();
  const scheduledEnd = new Date(now.getTime() + QUICK_SHIFT_HOURS * 60 * 60_000);

  // Create the shift already running and already clocked on, owned by + created
  // by this worker. Two audit lines: it was created, and it was clocked on.
  let newId: string;
  try {
    const shift = await prisma.shift.create({
      data: {
        status: "IN_PROGRESS",
        participantId,
        createdById: worker.id,
        allocatedToId: worker.id,
        scheduledStart: now,
        scheduledEnd,
        clockOnAt: now,
        idempotencyKey,
        ...tenantOwner(worker),
        events: {
          create: [
            { type: "CREATED", actorId: worker.id, detail: "Quick shift", ...tenantOwner(worker) },
            { type: "CLOCK_ON", actorId: worker.id, ...tenantOwner(worker) },
          ],
        },
      },
    });
    newId = shift.id;
  } catch (err) {
    // Lost the unique race to a concurrent identical submit — use the winner.
    if (isUniqueViolation(err) && idempotencyKey) {
      const existing = await prisma.shift.findUnique({ where: { idempotencyKey } });
      if (existing) redirect(`/shift/${existing.id}`);
    }
    throw err;
  }

  revalidatePath("/");
  redirect(`/shift/${newId}`); // straight to the tracker — nothing runs after this
}

// Prisma raises error code P2002 when a @unique constraint (idempotencyKey) is hit.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002"
  );
}
