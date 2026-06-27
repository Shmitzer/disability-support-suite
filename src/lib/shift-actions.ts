// shift-actions.ts — server actions a worker triggers from the homepage.
// Accept / decline an auctioned (OFFERED) shift. Every change writes to the
// append-only ShiftEvent audit log so the history is never lost.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

// Accept an auctioned shift: it becomes ALLOCATED to this worker.
export async function acceptShift(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const worker = await getCurrentWorker();
  if (!shiftId || !worker) return;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // Only an open auction can be accepted (guards against double-accept).
  if (!shift || shift.status !== "OFFERED") return;

  // Authorisation: the worker must be linked to this participant to see/accept.
  const link = await prisma.workerParticipant.findUnique({
    where: {
      workerId_participantId: {
        workerId: worker.id,
        participantId: shift.participantId,
      },
    },
  });
  if (!link) return;

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "ALLOCATED",
      allocatedToId: worker.id,
      allocatedAt: new Date(),
      events: {
        create: {
          type: "ACCEPTED",
          actorId: worker.id,
          detail: `Accepted by ${worker.name}`,
          ...tenantOwner(worker),
        },
      },
    },
  });

  revalidatePath("/");
}

// Decline an auctioned shift: it stays OFFERED for others, but we log that
// this worker passed so it drops off their list.
export async function declineShift(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const worker = await getCurrentWorker();
  if (!shiftId || !worker) return;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.status !== "OFFERED") return;

  await prisma.shiftEvent.create({
    data: {
      shiftId,
      type: "DECLINED",
      actorId: worker.id,
      detail: `Declined by ${worker.name}`,
      ...tenantOwner(worker),
    },
  });

  revalidatePath("/");
}
