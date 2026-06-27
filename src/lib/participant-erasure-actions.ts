// participant-erasure-actions.ts — honour a participant's right to erasure by
// DE-IDENTIFYING (not deleting) their record + retained free-text notes. NDIS records
// must survive ~7 years, so we strip identifiers and keep the de-identified service
// record. Admin-only (Capability.ParticipantErase), tenant-scoped, fully audited
// (Rule 9). The de-identification logic itself is pure in src/lib/anonymise.ts.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantScope } from "@/lib/tenant";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  anonymisedParticipantFields,
  redactNames,
  isAnonymised,
} from "@/lib/anonymise";

export type EraseParticipantResult = { ok: boolean; error?: string };

// De-identify a participant: clear their identifier fields, redact their name out of
// every retained progress note, and tombstone the record. Idempotent — re-running on
// an already-erased participant is a no-op success.
export async function anonymiseParticipant(
  participantId: string,
): Promise<EraseParticipantResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!can(worker.role, Capability.ParticipantErase)) {
    return { ok: false, error: "You don't have permission to erase participant records." };
  }

  // Must belong to the caller's tenant; pull the names we need to redact from notes.
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, ...tenantScope(worker) },
    select: { id: true, name: true, preferredName: true, anonymisedAt: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };
  if (isAnonymised(participant)) return { ok: true }; // already erased

  const now = new Date();
  const names = [participant.name, participant.preferredName].filter(
    (n): n is string => !!n,
  );

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Redact the participant's name out of each retained note body. We rewrite
      //    rawNotes + generatedNote in place — the note stays as a de-identified
      //    service record, but the name no longer appears.
      const notes = await tx.progressNote.findMany({
        where: { participantId },
        select: { id: true, rawNotes: true, generatedNote: true },
      });
      for (const note of notes) {
        await tx.progressNote.update({
          where: { id: note.id },
          data: {
            rawNotes: redactNames(note.rawNotes, names),
            generatedNote: redactNames(note.generatedNote, names),
          },
        });
      }

      // 2. Clear the participant's own identifier fields + set the tombstone.
      await tx.participant.update({
        where: { id: participantId },
        data: anonymisedParticipantFields(participantId, now),
      });
    });
  } catch (err) {
    console.error("anonymiseParticipant failed:", err);
    return {
      ok: false,
      error:
        "Couldn't complete erasure — the participant erasure columns may not be applied yet.",
    };
  }

  // Audit AFTER the fact, recording only non-identifying metadata (never the cleared
  // values). The hash chain makes the erasure itself tamper-evident.
  await recordAudit({
    action: "PARTICIPANT_ANONYMISED",
    targetType: "Participant",
    targetId: participantId,
    actorId: worker.id,
    organisationId: worker.organisationId,
    detail: { anonymisedAt: now.toISOString() },
  });

  revalidatePath(`/participants/${participantId}`);
  return { ok: true };
}
