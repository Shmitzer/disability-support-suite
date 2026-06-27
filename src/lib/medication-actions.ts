// medication-actions.ts — #6 full medication chart + eMAR administration log.
// LOGIC ONLY (cd builds the chart + round UI). Chart managed by a coordinator
// (CareProfileManage); administrations recorded by the worker on shift, audited.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal, canAccessParticipant } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { tenantOwner } from "@/lib/tenant";
import { canTransition, isMedAuthStatus, type MedAuthStatus } from "@/lib/med-authorisation";
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

// --- Authorisation state machine (coordinator/admin) ---
// Move a medication profile through the hard-gated authorisation chain
// (DRAFT→PENDING_BSP→PENDING_COMMISSION→PENDING_GUARDIAN→ACTIVE / DECLINED). The legal
// transitions are enforced here (src/lib/med-authorisation.ts) AND, independently, by a
// DB trigger (prisma/sql/medication.sql) so a direct write can't skip a stage. Each
// step appends an immutable MedAuthEvent (the audit chain) and a hash-chained audit row.
// Worker visibility is gated on ACTIVE downstream; this action is coordinator-only.
// LEGAL-GATED, DUMMY DATA ONLY (MED_VERIFICATION_SPEC).
export async function setMedicationAuthStatus(input: {
  medicationId: string;
  to: string;
  approverRole?: string; // BSP | COMMISSION | GUARDIAN | COORDINATOR
  referenceNumber?: string; // BSP ref / NDIS Commission authorisation number
  reason?: string; // required on a decline
}): Promise<MedResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!isMedAuthStatus(input.to)) return { ok: false, error: "Unknown authorisation status." };

  const med = await prisma.medication.findUnique({
    where: { id: input.medicationId },
    select: { id: true, participantId: true, organisationId: true, authStatus: true },
  });
  if (!med) return { ok: false, error: "Medication not found." };

  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: med.organisationId })) {
    return { ok: false, error: "You don't have permission to manage authorisation." };
  }

  const from: MedAuthStatus = isMedAuthStatus(med.authStatus) ? med.authStatus : "DRAFT";
  const to = input.to;
  if (from === to) return { ok: true, id: med.id }; // idempotent no-op
  if (!canTransition(from, to)) {
    return { ok: false, error: `Can't move authorisation from ${from} to ${to}.` };
  }
  if (to === "DECLINED" && !input.reason?.trim()) {
    return { ok: false, error: "A reason is required to decline." };
  }

  try {
    await prisma.medication.update({ where: { id: med.id }, data: { authStatus: to } });
    // Append the immutable authorisation-chain event.
    await prisma.medAuthEvent.create({
      data: {
        medicationId: med.id,
        stage: to,
        decision: to === "DECLINED" ? "DECLINED" : "APPROVED",
        approverId: worker.id,
        approverRole: input.approverRole ?? null,
        referenceNumber: input.referenceNumber ?? null,
        reason: input.reason ?? null,
        ...tenantOwner(worker),
      },
    });
    await recordAudit({
      action: "MEDICATION_AUTH_TRANSITION",
      targetType: "Medication",
      targetId: med.id,
      actorId: worker.id,
      organisationId: med.organisationId,
      detail: { from, to, approverRole: input.approverRole ?? null },
    });
    revalidatePath(`/participants/${med.participantId}`);
    return { ok: true, id: med.id };
  } catch (err) {
    console.error("setMedicationAuthStatus failed:", err);
    return { ok: false, error: "Couldn't update — the medication tables may not be set up yet." };
  }
}

// The authorisation chain for a medication (coordinator/admin view). Immutable, oldest→newest.
export async function listMedicationAuthEvents(medicationId: string) {
  const worker = await getCurrentWorker();
  if (!worker) return [];
  const med = await prisma.medication.findUnique({
    where: { id: medicationId },
    select: { organisationId: true },
  });
  if (!med) return [];
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: med.organisationId })) {
    return [];
  }
  try {
    // tenant-ok: gated above on CareProfileManage for this medication's org.
    return await prisma.medAuthEvent.findMany({
      where: { medicationId },
      orderBy: { occurredAt: "asc" },
    });
  } catch {
    return [];
  }
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
