// support-roster.ts — read model for a participant's "roster of supports": their
// scheduled support shifts (who, when, status, where). LOGIC ONLY — cd renders it on
// the worker's participant view and on the participant/family dashboard.
//
// Access (capability-gated, deny-by-default):
//   • platform admin;
//   • org staff with ShiftReadOrg in the participant's org (coordinator);
//   • a front-line worker who supports the participant (WorkerParticipant link OR
//     allocated to one of their shifts);
//   • a participant-grant principal with NotesRead/HandoverReceive on that participant
//     (family carer, guardian — and the participant themselves once self-access is
//     granted). getMySupportRoster() drives the participant/family dashboard from the
//     principal's own grants, so it shows live without a separate participant↔account link.

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability, type Principal } from "@/lib/rbac";

export type RosterWhen = "current" | "upcoming" | "past";

export type SupportRosterItem = {
  shiftId: string;
  when: RosterWhen;
  status: string; // DRAFT | OFFERED | ALLOCATED | IN_PROGRESS | COMPLETED | CANCELLED
  scheduledStart: string; // ISO
  scheduledEnd: string; // ISO
  workerName: string | null; // allocated worker (null = unallocated / offered)
  location: string | null;
};

export type SupportRoster = {
  participant: { id: string; name: string };
  items: SupportRosterItem[]; // chronological (current+upcoming first, then past)
};

export type RosterResult =
  | { ok: true; roster: SupportRoster }
  | { ok: false; error: string };

// Pure: where does a shift sit relative to `now`? (Exported for testing.)
export function classifyWhen(
  now: Date,
  scheduledStart: Date,
  scheduledEnd: Date,
  status: string,
): RosterWhen {
  if (status === "IN_PROGRESS") return "current";
  if (status === "COMPLETED" || status === "CANCELLED") return "past";
  if (scheduledEnd.getTime() < now.getTime()) return "past";
  if (scheduledStart.getTime() <= now.getTime() && now.getTime() <= scheduledEnd.getTime()) {
    return "current";
  }
  return "upcoming";
}

// May this principal (the current worker) view this participant's support roster?
async function canViewRoster(
  principal: Principal | null,
  workerId: string,
  participant: { id: string; organisationId: string | null },
): Promise<boolean> {
  if (!principal) return false;
  // Org staff (coordinator) or platform admin.
  if (can(principal, Capability.ShiftReadOrg, { organisationId: participant.organisationId })) {
    return true;
  }
  // Family/guardian/participant-self via an active participant grant.
  if (
    can(principal, Capability.NotesRead, { participantId: participant.id }) ||
    can(principal, Capability.HandoverReceive, { participantId: participant.id })
  ) {
    return true;
  }
  // Front-line worker who supports this participant (manager link or allocated shift).
  const link = await prisma.workerParticipant.findFirst({
    where: { workerId, participantId: participant.id },
    select: { id: true },
  });
  if (link) return true;
  const allocated = await prisma.shift.findFirst({
    where: { participantId: participant.id, allocatedToId: workerId },
    select: { id: true },
  });
  return Boolean(allocated);
}

function toItems(
  shifts: {
    id: string;
    status: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    location: string | null;
    allocatedTo: { name: string } | null;
  }[],
  now: Date,
): SupportRosterItem[] {
  const order: Record<RosterWhen, number> = { current: 0, upcoming: 1, past: 2 };
  return shifts
    .map((s) => ({
      shiftId: s.id,
      when: classifyWhen(now, s.scheduledStart, s.scheduledEnd, s.status),
      status: s.status,
      scheduledStart: s.scheduledStart.toISOString(),
      scheduledEnd: s.scheduledEnd.toISOString(),
      workerName: s.allocatedTo?.name ?? null,
      location: s.location,
    }))
    .sort(
      (a, b) =>
        order[a.when] - order[b.when] ||
        a.scheduledStart.localeCompare(b.scheduledStart),
    );
}

// A participant's roster of supports (worker view + participant/family view both use this).
export async function getParticipantSupportRoster(participantId: string): Promise<RosterResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { id: true, name: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };

  const principal = await getCurrentPrincipal();
  if (!(await canViewRoster(principal, worker.id, participant))) {
    return { ok: false, error: "You don't have access to this participant's supports." };
  }

  const shifts = await prisma.shift.findMany({
    where: { participantId, status: { not: "DRAFT" } },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      location: true,
      allocatedTo: { select: { name: true } },
    },
  });

  return {
    ok: true,
    roster: {
      participant: { id: participant.id, name: participant.name },
      items: toItems(shifts, new Date()),
    },
  };
}

// The current principal's OWN rosters — one per participant they hold a grant on.
// Drives the participant/family dashboard "live" view (reuses the grant model, so no
// separate participant↔account link is needed yet).
export async function getMySupportRosters(): Promise<SupportRoster[]> {
  const principal = await getCurrentPrincipal();
  if (!principal) return [];
  const participantIds = [...new Set(principal.grants.map((g) => g.participantId))];
  const out: SupportRoster[] = [];
  for (const id of participantIds) {
    const r = await getParticipantSupportRoster(id);
    if (r.ok) out.push(r.roster);
  }
  return out;
}
