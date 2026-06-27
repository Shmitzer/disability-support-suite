// message-actions.ts — #12 care-team messaging (a per-participant thread). LOGIC ONLY
// (cd renders the thread). Anyone who can access the participant can read/post; posting
// notifies the other linked care-team members.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { canAccessParticipant } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function postMessage(input: {
  participantId: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const body = (input.body ?? "").trim();
  if (!body) return { ok: false, error: "Write a message." };
  if (!(await canAccessParticipant(input.participantId))) {
    return { ok: false, error: "You don't have access to this participant." };
  }
  try {
    const msg = await prisma.message.create({
      data: {
        participantId: input.participantId,
        organisationId: worker.organisationId,
        senderId: worker.id,
        body,
      },
    });
    // Notify the other linked care-team workers (best-effort).
    try {
      const team = await prisma.workerParticipant.findMany({
        where: { participantId: input.participantId, workerId: { not: worker.id } },
        select: { workerId: true },
      });
      await Promise.all(
        team.map((t) =>
          notify({
            userId: t.workerId,
            organisationId: worker.organisationId,
            type: "message",
            title: "New care-team message",
            body: body.slice(0, 140),
            entityType: "Participant",
            entityId: input.participantId,
          }),
        ),
      );
    } catch {
      /* ignore */
    }
    revalidatePath(`/participants/${input.participantId}`);
    return { ok: true, id: msg.id };
  } catch (err) {
    console.error("postMessage failed:", err);
    return { ok: false, error: "Couldn't send — the messages table may not be set up yet." };
  }
}

export async function listParticipantMessages(participantId: string, take = 100) {
  if (!(await canAccessParticipant(participantId))) return [];
  try {
    return await prisma.message.findMany({
      where: { participantId },
      orderBy: { createdAt: "asc" },
      take,
    });
  } catch {
    return [];
  }
}
