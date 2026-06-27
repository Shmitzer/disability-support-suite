// context.ts — gathers the live, role-scoped context the Caira system prompt needs.
//
// Everything here is tenant-scoped (Rule 5) and defensive: if a Caira column/table
// hasn't been applied yet (prisma/sql convention) the helpers fall back to safe
// defaults so chat still works. We only ever read data the caller's session already
// legitimately exposes — no independent personal-data fetches (dummy-data guardrail).

import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/tenant";
import type { Worker } from "@/generated/prisma/client";

// Local midnight → used to scope "today" queries.
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── WORKER ──────────────────────────────────────────────────────────────────
export type WorkerContext = {
  participantName: string;
  shiftStartTime: string;
  eventsLoggedToday: string[];
};

export async function buildWorkerContext(worker: Worker): Promise<WorkerContext> {
  try {
    // The worker's active shift: prefer IN_PROGRESS, else most recent ALLOCATED.
    const shift = await prisma.shift.findFirst({
      where: {
        allocatedToId: worker.id,
        status: { in: ["IN_PROGRESS", "ALLOCATED"] },
        ...tenantScope(worker),
      },
      orderBy: [{ status: "asc" }, { scheduledStart: "desc" }],
      include: { participant: { select: { name: true } } },
    });

    if (!shift) {
      return { participantName: "your participant", shiftStartTime: "not on shift", eventsLoggedToday: [] };
    }

    // tenant-ok: scoped to `shift.id`, and that shift was fetched with tenantScope(worker)
    // above — so these entries are transitively confined to the caller's tenant.
    const entries = await prisma.logEntry.findMany({
      where: { shiftId: shift.id, timestamp: { gte: startOfToday() } },
      orderBy: { timestamp: "asc" },
      select: { category: true, detail: true, notes: true, timestamp: true },
    });

    const eventsLoggedToday = entries.map(
      (e: { category: string; detail: string | null; notes: string; timestamp: Date }) => {
        const bits = [e.category, e.detail, e.notes].filter((b) => b && String(b).trim());
        return `${hhmm(e.timestamp)} — ${bits.join(" · ")}`;
      },
    );

    const start = shift.clockOnAt ?? shift.scheduledStart;
    return {
      participantName: shift.participant?.name ?? "your participant",
      shiftStartTime: start ? hhmm(start) : "not recorded",
      eventsLoggedToday,
    };
  } catch (err) {
    console.error("buildWorkerContext failed:", err);
    return { participantName: "your participant", shiftStartTime: "not recorded", eventsLoggedToday: [] };
  }
}

// ─── PARTICIPANT ─────────────────────────────────────────────────────────────
export type ParticipantContext = {
  participantName: string;
  workerName: string;
  todaySchedule: string[];
  aiLevel: "simple" | "adjusted";
};

export async function buildParticipantContext(user: Worker): Promise<ParticipantContext> {
  // The participant-user's own display name is the participant name.
  const participantName = user.name || "friend";
  // Language level lives on the Worker row; tolerate the column being absent.
  const aiLevel =
    (user as { participantAILevel?: string }).participantAILevel === "adjusted" ? "adjusted" : "simple";

  let workerName = "your support worker";
  const todaySchedule: string[] = [];

  try {
    // Best-effort: match a Participant record by name within the user's tenant, then
    // read today's shift to find the assigned worker. Dummy data only until Phase 5.
    const participant = await prisma.participant.findFirst({
      where: { name: participantName, ...tenantScope(user) },
      select: { id: true },
    });
    if (participant) {
      const shift = await prisma.shift.findFirst({
        where: {
          participantId: participant.id,
          scheduledStart: { gte: startOfToday() },
        },
        orderBy: { scheduledStart: "asc" },
        include: { allocatedTo: { select: { name: true } } },
      });
      if (shift?.allocatedTo?.name) workerName = shift.allocatedTo.name;
      if (shift) {
        const when = hhmm(shift.scheduledStart);
        todaySchedule.push(`${when}${shift.location ? ` · ${shift.location}` : ""}`);
      }
    }
  } catch (err) {
    console.error("buildParticipantContext failed:", err);
  }

  return { participantName, workerName, todaySchedule, aiLevel };
}

// Find the worker assigned to a participant-user right now, so a safety flag can be
// routed to the right person. Returns null when there's no clear match.
export async function findAssignedWorkerId(user: Worker): Promise<{ workerId: string | null; shiftId: string | null; participantId: string | null }> {
  try {
    const participant = await prisma.participant.findFirst({
      where: { name: user.name, ...tenantScope(user) },
      select: { id: true },
    });
    if (!participant) return { workerId: null, shiftId: null, participantId: null };
    const shift = await prisma.shift.findFirst({
      where: { participantId: participant.id, status: { in: ["IN_PROGRESS", "ALLOCATED"] } },
      orderBy: { scheduledStart: "desc" },
      select: { id: true, allocatedToId: true },
    });
    return { workerId: shift?.allocatedToId ?? null, shiftId: shift?.id ?? null, participantId: participant.id };
  } catch (err) {
    console.error("findAssignedWorkerId failed:", err);
    return { workerId: null, shiftId: null, participantId: null };
  }
}

// ─── SUPERVISOR ──────────────────────────────────────────────────────────────
export type SupervisorContext = {
  orgName: string;
  activeShiftsToday: number;
  openFlags: number;
};

export async function buildSupervisorContext(user: Worker): Promise<SupervisorContext> {
  let orgName = "your organisation";
  let activeShiftsToday = 0;
  let openFlags = 0;

  try {
    if (user.organisationId) {
      const org = await prisma.organisation.findUnique({
        where: { id: user.organisationId },
        select: { name: true },
      });
      if (org?.name) orgName = org.name;
    }
    activeShiftsToday = await prisma.shift.count({
      where: { status: "IN_PROGRESS", ...tenantScope(user) },
    });
  } catch (err) {
    console.error("buildSupervisorContext (shifts) failed:", err);
  }

  try {
    openFlags = await prisma.cairaFlag.count({
      where: { seenByWorker: false, ...(user.organisationId ? { organisationId: user.organisationId } : {}) },
    });
  } catch {
    // CairaFlag table not applied yet — treat as zero open flags.
    openFlags = 0;
  }

  return { orgName, activeShiftsToday, openFlags };
}
