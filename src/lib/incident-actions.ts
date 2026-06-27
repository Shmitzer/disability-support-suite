// incident-actions.ts — #2 incident register + reportable workflow. First-class
// incidents with the mandatory NDIS fields, a report → review → close lifecycle, and
// audit. LOGIC ONLY — cd builds the form + register UI.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { notifyOrgManagers } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const TYPES = new Set(["physical", "behavioural", "environmental", "medical", "other"]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);

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
}): Promise<IncidentResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!TYPES.has(input.type)) return { ok: false, error: "Pick an incident type." };
  if (!SEVERITIES.has(input.severity)) return { ok: false, error: "Pick a severity." };
  if (!input.description?.trim()) return { ok: false, error: "Describe what happened." };

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
        reportable: Boolean(input.reportable),
        status: "OPEN",
      },
    });
    await recordAudit({
      action: "INCIDENT_REPORTED",
      targetType: input.participantId ? "Participant" : "Incident",
      targetId: input.participantId ?? incident.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { incidentId: incident.id, type: input.type, severity: input.severity, reportable: Boolean(input.reportable) },
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
