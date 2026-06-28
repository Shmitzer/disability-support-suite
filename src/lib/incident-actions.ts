// incident-actions.ts — #2 incident register + reportable workflow. First-class
// incidents with the mandatory NDIS fields, a report → review → close lifecycle, and
// audit. LOGIC ONLY — cd builds the form + register UI.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal, canAccessParticipant } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { notifyOrgManagers } from "@/lib/notifications";
import { deriveRpReportable, isRpType, type RpType } from "@/lib/hub";
import { revalidatePath } from "next/cache";

const TYPES = new Set(["physical", "behavioural", "environmental", "medical", "other"]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);

// Restrictive-practice (RP) capture — HUB_DATA_MODEL.md §RP. Promotes RP use to a
// first-class compliant Incident; an unauthorised/emergency use auto-flags reportable.
export type RestrictivePracticeInput = {
  rpType: RpType | string;
  rpAuthorised: boolean; // under the current BSP? false → unauthorised/emergency
  rpRoutineOrPrn?: "ROUTINE" | "PRN" | null;
  rpMedication?: string | null; // chemical restraint drug
  rpDose?: string | null; // chemical restraint dose
  rpDurationMinutes?: number | null; // physical / seclusion duration
  lessRestrictiveTried?: string | null;
  bspReference?: string | null;
  medicationAdminId?: string | null; // eMAR cross-reference
};

export type IncidentResult = { ok: boolean; error?: string; incidentId?: string };

// Report an incident (any worker). reportable=true marks it for the NDIS Commission
// workflow. occurredAt defaults to now if not given.
export async function reportIncident(input: {
  type: string;
  severity: string;
  description: string;
  participantId?: string | null;
  shiftId?: string | null;
  occurredAt?: string | null;
  immediateAction?: string;
  notified?: { participant?: boolean; guardian?: boolean; supervisor?: boolean; commission?: boolean };
  followUp?: string;
  reportable?: boolean;
  // When present, this incident records a restrictive practice. An unauthorised use
  // (rpAuthorised=false) auto-flags reportable=true regardless of the reportable arg.
  restrictivePractice?: RestrictivePracticeInput | null;
}): Promise<IncidentResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!TYPES.has(input.type)) return { ok: false, error: "Pick an incident type." };
  if (!SEVERITIES.has(input.severity)) return { ok: false, error: "Pick a severity." };
  if (!input.description?.trim()) return { ok: false, error: "Describe what happened." };

  // A client-supplied participantId must be one the caller can actually access —
  // otherwise a worker could file an incident (incl. a restrictive-practice record)
  // against a participant in another org (cross-org record pollution).
  if (input.participantId && !(await canAccessParticipant(input.participantId))) {
    return { ok: false, error: "You don't have access to this participant." };
  }

  const rp = input.restrictivePractice ?? null;
  if (rp && !isRpType(rp.rpType)) return { ok: false, error: "Pick a restrictive-practice type." };

  // Unauthorised/emergency RP is always reportable to the NDIS Commission.
  const reportable = deriveRpReportable({
    restrictivePractice: Boolean(rp),
    rpAuthorised: rp?.rpAuthorised,
    reportable: input.reportable,
  });

  try {
    const incident = await prisma.incident.create({
      data: {
        type: input.type,
        severity: input.severity,
        description: input.description.trim(),
        participantId: input.participantId ?? null,
        shiftId: input.shiftId ?? null,
        reportedById: worker.id,
        organisationId: worker.organisationId,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        immediateAction: input.immediateAction ?? null,
        notified: input.notified ?? undefined,
        followUp: input.followUp ?? null,
        reportable,
        status: "OPEN",
        ...(rp
          ? {
              restrictivePractice: true,
              rpType: rp.rpType,
              rpAuthorised: rp.rpAuthorised,
              rpRoutineOrPrn: rp.rpRoutineOrPrn ?? null,
              rpMedication: rp.rpMedication ?? null,
              rpDose: rp.rpDose ?? null,
              rpDurationMinutes: rp.rpDurationMinutes ?? null,
              lessRestrictiveTried: rp.lessRestrictiveTried ?? null,
              bspReference: rp.bspReference ?? null,
              medicationAdminId: rp.medicationAdminId ?? null,
            }
          : {}),
      },
    });
    await recordAudit({
      action: rp ? "RESTRICTIVE_PRACTICE_RECORDED" : "INCIDENT_REPORTED",
      targetType: input.participantId ? "Participant" : "Incident",
      targetId: input.participantId ?? incident.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: {
        incidentId: incident.id,
        type: input.type,
        severity: input.severity,
        reportable,
        ...(rp ? { restrictivePractice: true, rpType: rp.rpType, rpAuthorised: rp.rpAuthorised } : {}),
      },
    });
    await notifyOrgManagers(worker.organisationId, {
      type: "incident",
      title: `New ${input.severity} incident reported`,
      body: input.description.slice(0, 140),
      link: "/console/incidents",
      entityType: "Incident",
      entityId: incident.id,
    });
    revalidatePath("/console/incidents");
    return { ok: true, incidentId: incident.id };
  } catch (err) {
    console.error("reportIncident failed:", err);
    return { ok: false, error: "Couldn't save the incident — the table may not be set up yet." };
  }
}

// Review / progress / close an incident (oversight — IncidentManage).
export async function reviewIncident(input: {
  incidentId: string;
  status: "UNDER_REVIEW" | "CLOSED";
  reviewNotes?: string;
}): Promise<IncidentResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const incident = await prisma.incident.findUnique({
    where: { id: input.incidentId },
    select: { id: true, organisationId: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.IncidentManage, { organisationId: incident.organisationId })) {
    return { ok: false, error: "You don't have permission to review incidents." };
  }
  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status: input.status,
      reviewNotes: input.reviewNotes ?? null,
      reviewedById: worker.id,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    action: input.status === "CLOSED" ? "INCIDENT_CLOSED" : "INCIDENT_REVIEWED",
    targetType: "Incident",
    targetId: incident.id,
    actorId: worker.id,
    organisationId: incident.organisationId,
    detail: { incidentId: incident.id, status: input.status },
  });
  revalidatePath("/console/incidents");
  return { ok: true, incidentId: incident.id };
}

// The org incident register (oversight — ShiftReadOrg).
export async function listOrgIncidents(filter?: { status?: string; participantId?: string }) {
  const worker = await getCurrentWorker();
  if (!worker?.organisationId) return [];
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.ShiftReadOrg, { organisationId: worker.organisationId })) {
    return [];
  }
  try {
    return await prisma.incident.findMany({
      where: {
        organisationId: worker.organisationId,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.participantId ? { participantId: filter.participantId } : {}),
      },
      orderBy: [{ status: "asc" }, { occurredAt: "desc" }],
      take: 200,
    });
  } catch {
    return [];
  }
}
