// medication-actions.ts — #6 full medication chart + eMAR administration log.
// LOGIC ONLY (cd builds the chart + round UI). Chart managed by a coordinator
// (CareProfileManage); administrations recorded by the worker on shift, audited.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal, canAccessParticipant } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const ADMIN_STATUS = new Set(["GIVEN", "WITHHELD", "REFUSED", "PRN_GIVEN"]);

export type MedResult = { ok: boolean; error?: string; id?: string };

// --- Chart management (coordinator) ---
export async function addMedication(input: {
  participantId: string;
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  scheduleTimes?: string[];
  prn?: boolean;
  prnProtocol?: string;
  notes?: string;
}): Promise<MedResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const participant = await prisma.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: participant.organisationId })) {
    return { ok: false, error: "You don't have permission to edit the medication chart." };
  }
  if (!input.name.trim()) return { ok: false, error: "A medication name is required." };
  try {
    const med = await prisma.medication.create({
      data: {
        participantId: participant.id,
        organisationId: participant.organisationId,
        name: input.name.trim(),
        dose: input.dose ?? null,
        route: input.route ?? null,
        frequency: input.frequency ?? null,
        scheduleTimes: input.scheduleTimes ?? undefined,
        prn: Boolean(input.prn),
        prnProtocol: input.prnProtocol ?? null,
        notes: input.notes ?? null,
        createdById: worker.id,
      },
    });
    await recordAudit({
      action: "MEDICATION_ADDED",
      targetType: "Participant",
      targetId: participant.id,
      actorId: worker.id,
      organisationId: participant.organisationId,
      detail: { medicationId: med.id, name: input.name },
    });
    revalidatePath(`/participants/${participant.id}`);
    return { ok: true, id: med.id };
  } catch (err) {
    console.error("addMedication failed:", err);
    return { ok: false, error: "Couldn't save — the medication table may not be set up yet." };
  }
}

export async function archiveMedication(medicationId: string): Promise<MedResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const med = await prisma.medication.findUnique({
    where: { id: medicationId },
    select: { id: true, participantId: true, organisationId: true },
  });
  if (!med) return { ok: false, error: "Medication not found." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: med.organisationId })) {
    return { ok: false, error: "You don't have permission to edit the medication chart." };
  }
  await prisma.medication.update({ where: { id: medicationId }, data: { active: false } });
  revalidatePath(`/participants/${med.participantId}`);
  return { ok: true };
}

export async function listMedications(participantId: string) {
  if (!(await canAccessParticipant(participantId))) return [];
  try {
    return await prisma.medication.findMany({
      where: { participantId, active: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

// --- eMAR (worker records an administration) ---
export async function recordAdministration(input: {
  medicationId: string;
  shiftId?: string | null;
  status: string; // GIVEN | WITHHELD | REFUSED | PRN_GIVEN
  dose?: string;
  note?: string;
  witnessedById?: string | null;
  scheduledAt?: string | null;
}): Promise<MedResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!ADMIN_STATUS.has(input.status)) return { ok: false, error: "Invalid administration status." };
  const med = await prisma.medication.findUnique({
    where: { id: input.medicationId },
    select: { id: true, participantId: true, organisationId: true },
  });
  if (!med) return { ok: false, error: "Medication not found." };
  if (!(await canAccessParticipant(med.participantId))) {
    return { ok: false, error: "You don't have access to this participant." };
  }
  try {
    const rec = await prisma.medicationAdministration.create({
      data: {
        medicationId: med.id,
        participantId: med.participantId,
        shiftId: input.shiftId ?? null,
        organisationId: med.organisationId,
        status: input.status,
        dose: input.dose ?? null,
        note: input.note ?? null,
        witnessedById: input.witnessedById ?? null,
        administeredById: worker.id,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });
    // Medication administration is clinically significant → always audited (Rule 9).
    await recordAudit({
      action: "MEDICATION_ADMINISTERED",
      targetType: "Participant",
      targetId: med.participantId,
      actorId: worker.id,
      organisationId: med.organisationId,
      detail: { medicationId: med.id, administrationId: rec.id, status: input.status },
    });
    if (input.shiftId) revalidatePath(`/shift/${input.shiftId}`);
    return { ok: true, id: rec.id };
  } catch (err) {
    console.error("recordAdministration failed:", err);
    return { ok: false, error: "Couldn't record — the table may not be set up yet." };
  }
}

export async function listAdministrations(participantId: string, take = 100) {
  if (!(await canAccessParticipant(participantId))) return [];
  try {
    return await prisma.medicationAdministration.findMany({
      where: { participantId },
      orderBy: { administeredAt: "desc" },
      take,
    });
  } catch {
    return [];
  }
}
