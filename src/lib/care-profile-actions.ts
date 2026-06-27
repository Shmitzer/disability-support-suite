// care-profile-actions.ts — manage a participant's care profile (condition tags +
// support-need flags). Coordinator/clinical only (Capability.CareProfileManage),
// tenant-scoped, and every save is audited (Rule 9).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantScope, tenantOwner } from "@/lib/tenant";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { CONDITIONS, SupportNeed } from "@/lib/care-needs";
import { revalidatePath } from "next/cache";

const VALID_CONDITIONS = new Set<string>(CONDITIONS);
const VALID_NEEDS = new Set<string>(Object.values(SupportNeed));

export type SaveCareProfileResult = { ok: boolean; error?: string };

// Create/update a participant's care profile. Validates the caller may manage it and
// that the participant is in their tenant; keeps only known conditions/flags.
export async function saveCareProfile(
  participantId: string,
  conditions: string[],
  supportNeeds: string[],
): Promise<SaveCareProfileResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!can(worker.role, Capability.CareProfileManage)) {
    return { ok: false, error: "You don't have permission to edit care profiles." };
  }

  // The participant must belong to the caller's tenant.
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, ...tenantScope(worker) },
    select: { id: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };

  // Trust nothing from the client: drop anything not in the curated vocabularies.
  const cleanConditions = [...new Set(conditions)].filter((c) => VALID_CONDITIONS.has(c));
  const cleanNeeds = [...new Set(supportNeeds)].filter((n) => VALID_NEEDS.has(n));

  try {
    await prisma.participantCareProfile.upsert({
      where: { participantId },
      create: {
        participantId,
        conditions: cleanConditions,
        supportNeeds: cleanNeeds,
        updatedById: worker.id,
        ...tenantOwnerOrg(worker),
      },
      update: {
        conditions: cleanConditions,
        supportNeeds: cleanNeeds,
        updatedById: worker.id,
      },
    });
  } catch (err) {
    console.error("saveCareProfile failed:", err);
    return {
      ok: false,
      error: "Couldn't save the care profile — the profile table may not be set up yet.",
    };
  }

  await recordAudit({
    action: "CARE_PROFILE_UPDATED",
    targetType: "Participant",
    targetId: participantId,
    actorId: worker.id,
    organisationId: worker.organisationId,
    detail: { conditions: cleanConditions, supportNeeds: cleanNeeds },
  });

  revalidatePath(`/participants/${participantId}/care-profile`);
  return { ok: true };
}

// ParticipantCareProfile carries only organisationId (no userId), so stamp just the org.
function tenantOwnerOrg(worker: Parameters<typeof tenantOwner>[0]) {
  return { organisationId: worker.organisationId };
}
