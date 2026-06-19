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
    const existing = await prisma.participant.findFirst({ where: { name: typedName } });
    participantId = existing
      ? existing.id
      : (await prisma.participant.create({ data: { name: typedName } })).id;
  } else if (pickedId) {
    // Otherwise use the dropdown choice — but confirm it really exists.
    const picked = await prisma.participant.findUnique({ where: { id: pickedId } });
    participantId = picked?.id ?? null;
  }

  if (!participantId) return; // nothing typed and nothing chosen — do nothing

  const now = new Date();
  const scheduledEnd = new Date(now.getTime() + QUICK_SHIFT_HOURS * 60 * 60_000);

  // Create the shift already running and already clocked on, owned by + created
  // by this worker. Two audit lines: it was created, and it was clocked on.
  const shift = await prisma.shift.create({
    data: {
      status: "IN_PROGRESS",
      participantId,
      createdById: worker.id,
      allocatedToId: worker.id,
      scheduledStart: now,
      scheduledEnd,
      clockOnAt: now,
      events: {
        create: [
          { type: "CREATED", actorId: worker.id, detail: "Quick shift" },
          { type: "CLOCK_ON", actorId: worker.id },
        ],
      },
    },
  });

  revalidatePath("/");
  redirect(`/shift/${shift.id}`); // straight to the tracker — nothing runs after this
}
