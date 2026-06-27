// handover-actions.ts — #12 shift handover. A worker writes a handover for their shift;
// the next worker / care team reads + acknowledges it. LOGIC ONLY (cd renders it).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { canAccessParticipant } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// Write a handover for the current worker's shift.
export async function writeHandover(input: {
  shiftId: string;
  body: string;
  toWorkerId?: string | null;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const body = (input.body ?? "").trim();
  if (!body) return { ok: false, error: "Write the handover." };
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    select: { id: true, allocatedToId: true, participantId: true, organisationId: true },
  });
  if (!shift || shift.allocatedToId !== worker.id) {
    return { ok: false, error: "This isn't your shift." };
  }
  // A directed handover may only target a worker in the shift's org — otherwise the
  // body excerpt in the notification could be sent to a user in another org.
  if (input.toWorkerId) {
    const recipient = await prisma.worker.findFirst({
      where: { id: input.toWorkerId, organisationId: shift.organisationId },
      select: { id: true },
    });
    if (!recipient) return { ok: false, error: "That recipient isn't in this organisation." };
  }
  try {
    const ho = await prisma.shiftHandover.create({
      data: {
        shiftId: shift.id,
        participantId: shift.participantId,
        organisationId: shift.organisationId,
        fromWorkerId: worker.id,
        toWorkerId: input.toWorkerId ?? null,
        body,
      },
    });
    if (input.toWorkerId) {
      await notify({
        userId: input.toWorkerId,
        organisationId: shift.organisationId,
        type: "handover",
        title: "Shift handover for you",
        body: body.slice(0, 140),
        entityType: "Shift",
        entityId: shift.id,
      });
    }
    revalidatePath(`/shift/${shift.id}`);
    return { ok: true, id: ho.id };
  } catch (err) {
    console.error("writeHandover failed:", err);
    return { ok: false, error: "Couldn't save — the handover table may not be set up yet." };
  }
}

// Latest handover for a participant (what the incoming worker should read).
export async function latestHandover(participantId: string) {
  if (!(await canAccessParticipant(participantId))) return null;
  try {
    return await prisma.shiftHandover.findFirst({
      where: { participantId },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}

// Acknowledge receipt of a handover (the incoming worker / care team).
export async function acknowledgeHandover(handoverId: string): Promise<{ ok: boolean; error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const ho = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    select: { id: true, participantId: true, shiftId: true, organisationId: true, toWorkerId: true },
  });
  if (!ho) return { ok: false, error: "Handover not found." };
  // Authorize even when participantId is null (it's nullable): the caller must be the
  // named recipient, have participant access, or be in the handover's org. Previously a
  // null-participant handover skipped the check entirely (any signed-in user could ack).
  const allowed =
    ho.toWorkerId === worker.id ||
    (ho.participantId ? await canAccessParticipant(ho.participantId) : false) ||
    (ho.organisationId != null && ho.organisationId === worker.organisationId);
  if (!allowed) {
    return { ok: false, error: "You don't have access to this handover." };
  }
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: { acknowledgedAt: new Date(), acknowledgedById: worker.id },
  });
  revalidatePath(`/shift/${ho.shiftId}`);
  return { ok: true };
}
