// roster.ts — reads everything the rostering (manager) view needs: the list of
// participants for the "create shift" form, every shift with its participant /
// assignee / latest audit-log event, and which workers are linked to each
// participant (so a shift can only be allocated/offered to the right people).

import { prisma } from "@/lib/prisma";
import { isWorkerRole } from "@/lib/enums";
import { tenantScope, type TenantActor } from "@/lib/tenant";

// Shifts that still need or allow manager action come first; finished ones last.
const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  OFFERED: 1,
  ALLOCATED: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

// Everything is scoped to the viewer's tenant (org members see their whole org;
// a solo worker sees only their own rows), so the roster never shows another
// tenant's participants/shifts/links/amendments.
export async function getRosterData(viewer: TenantActor) {
  const scope = tenantScope(viewer);
  const [participants, shifts, links, amendments] = await Promise.all([
    prisma.participant.findMany({
      where: scope,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shift.findMany({
      where: scope,
      include: {
        participant: true,
        allocatedTo: true,
        // Just the most recent event, to show "what happened last".
        events: { orderBy: { createdAt: "desc" }, take: 1, include: { actor: true } },
      },
    }),
    // Worker↔participant links, so we know who each shift can go to.
    prisma.workerParticipant.findMany({ where: scope, include: { worker: true } }),
    // Outstanding clock-time amendment requests, oldest first, with the shift
    // (and its participant) and who asked — everything the approve/reject card
    // needs to show the manager.
    prisma.clockAmendmentRequest.findMany({
      where: { status: "PENDING", ...scope },
      include: { shift: { include: { participant: true } }, requestedBy: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // participantId -> the support workers a manager has linked to them.
  const linkedWorkers: Record<string, { id: string; name: string }[]> = {};
  for (const l of links) {
    if (!isWorkerRole(l.worker.role)) continue; // only front-line workers do shifts
    (linkedWorkers[l.participantId] ??= []).push({
      id: l.worker.id,
      name: l.worker.name,
    });
  }

  // Sort: actionable first, then soonest-scheduled within each group.
  const sorted = [...shifts].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return a.scheduledStart.getTime() - b.scheduledStart.getTime();
  });

  return { participants, shifts: sorted, linkedWorkers, amendments };
}
