// roster-actions.ts — the manager's shift controls. Create a shift, then move
// it through its life: allocate to a worker, offer it to linked workers
// (auction), or cancel it. Every change writes to the append-only ShiftEvent
// audit log, and every action checks the caller is rostering staff.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner, tenantScope } from "@/lib/tenant";
import { isRosteringRole } from "@/lib/enums";
import { revalidatePath } from "next/cache";

// Confirm the person doing this is rostering staff. Returns the worker, or null.
async function requireRostering() {
  const worker = await getCurrentWorker();
  return isRosteringRole(worker?.role) ? worker : null;
}

// Create a new shift as a DRAFT (not yet allocated or offered).
export async function createShift(formData: FormData) {
  const manager = await requireRostering();
  if (!manager) return;

  const participantId = String(formData.get("participantId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  if (!participantId || !date || !start || !end) return;

  // Combine the date + time fields into real timestamps.
  const scheduledStart = new Date(`${date}T${start}`);
  const scheduledEnd = new Date(`${date}T${end}`);
  if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) return;
  if (scheduledEnd <= scheduledStart) return; // end must be after start

  // The participant must belong to the manager's tenant.
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, ...tenantScope(manager) },
  });
  if (!participant) return;

  await prisma.shift.create({
    data: {
      status: "DRAFT",
      participantId,
      location,
      createdById: manager.id,
      scheduledStart,
      scheduledEnd,
      ...tenantOwner(manager),
      events: { create: { type: "CREATED", actorId: manager.id, ...tenantOwner(manager) } },
    },
  });

  revalidatePath("/");
}

// Allocate a draft/offered shift directly to a linked worker.
export async function allocateShift(formData: FormData) {
  const manager = await requireRostering();
  if (!manager) return;

  const shiftId = String(formData.get("shiftId") ?? "");
  const workerId = String(formData.get("workerId") ?? "");
  if (!shiftId || !workerId) return;

  const shift = await prisma.shift.findFirst({ where: { id: shiftId, ...tenantScope(manager) } });
  if (!shift || (shift.status !== "DRAFT" && shift.status !== "OFFERED")) return;

  // The worker must be linked to this shift's participant.
  const link = await prisma.workerParticipant.findUnique({
    where: {
      workerId_participantId: { workerId, participantId: shift.participantId },
    },
  });
  if (!link) return;

  // The assignee must belong to the manager's tenant too.
  const assignee = await prisma.worker.findFirst({ where: { id: workerId, ...tenantScope(manager) } });
  if (!assignee) return;

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "ALLOCATED",
      allocatedToId: workerId,
      allocatedAt: new Date(),
      events: {
        create: {
          type: "ALLOCATED",
          actorId: manager.id,
          detail: `Allocated to ${assignee?.name ?? "worker"}`,
          ...tenantOwner(manager),
        },
      },
    },
  });

  revalidatePath("/");
}

// Offer a draft shift up for auction to the participant's linked workers.
export async function offerShift(formData: FormData) {
  const manager = await requireRostering();
  if (!manager) return;

  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return;

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, ...tenantScope(manager) },
    include: { participant: true },
  });
  if (!shift || shift.status !== "DRAFT") return; // only a draft can be offered

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "OFFERED",
      events: {
        create: {
          type: "OFFERED",
          actorId: manager.id,
          detail: `Offered to workers linked to ${shift.participant.name}`,
          ...tenantOwner(manager),
        },
      },
    },
  });

  revalidatePath("/");
}

// Cancel a shift (kept in the database for reporting). Optional reason.
export async function cancelShift(formData: FormData) {
  const manager = await requireRostering();
  if (!manager) return;

  const shiftId = String(formData.get("shiftId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!shiftId) return;

  const shift = await prisma.shift.findFirst({ where: { id: shiftId, ...tenantScope(manager) } });
  // Don't cancel something already finished or cancelled.
  if (!shift || shift.status === "COMPLETED" || shift.status === "CANCELLED") return;

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
      events: {
        create: { type: "CANCELLED", actorId: manager.id, detail: reason, ...tenantOwner(manager) },
      },
    },
  });

  revalidatePath("/");
}
