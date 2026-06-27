// Participant Hub — the shared-iPad "care station" (HUB_DATA_MODEL.md / PARTICIPANT_HUB_SPEC.md).
//
// A participant-anchored attendance layer above Shift: N concurrent attendees
// (workers + family/guardian) attributing entries to ONE cross-org, consent-gated
// timeline. This server component picks/opens the participant session, gathers the
// "on shift now" actors + the unified timeline, then hands interactivity to
// HubClient ("use client"): tap-to-identify → PIN sheet → capacity pick → "Logging
// as…" → quick-log tiles → Lock.
//
// Graceful degradation throughout: if the hub tables aren't applied yet, the server
// actions return { ok:false, error } and the client surfaces a calm message — the
// screen never crashes.

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { openHubSession, participantHubTimeline } from "@/lib/hub-actions";
import CairaEmpty from "@/components/caira/CairaEmpty";
import { HubClient, type HubWorker, type HubTimelineItem } from "./HubClient";

// Always read fresh on each request (the timeline + on-shift set change live).
export const dynamic = "force-dynamic";

export default async function HubPage() {
  const me = await getCurrentUser();
  if (!me) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16">
        <CairaEmpty
          message="No worker found"
          submessage="Run the seed script to add sample data."
        />
      </main>
    );
  }

  // Pick the participant this care station is for. Prefer one that already has an
  // OPEN hub session (the live care station); otherwise the first participant the
  // viewer can see. (Dummy/seed data only — never real participant data.)
  let participant:
    | { id: string; name: string }
    | null = null;
  try {
    const openSession = await prisma.hubSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { participantId: true },
    });
    if (openSession) {
      participant = await prisma.participant.findUnique({
        where: { id: openSession.participantId },
        select: { id: true, name: true },
      });
    }
  } catch {
    // hub tables not applied — fall through to first participant
  }
  if (!participant) {
    participant = await prisma.participant.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
  }

  if (!participant) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16">
        <CairaEmpty
          message="No participant to anchor a care station"
          submessage="Add a participant (seed data) to open the hub."
        />
      </main>
    );
  }

  // Open (or reuse) the participant-anchored session. Best-effort: a failure here
  // (tables missing) just means no live session id — the client still renders and
  // surfaces a calm message when an action is attempted.
  const sessionRes = await openHubSession({ participantId: participant.id });
  const sessionId = sessionRes.ok ? sessionRes.sessionId : null;
  const sessionError = sessionRes.ok ? null : sessionRes.error;

  // The "on shift now · tap to log as you" row. We surface the workers currently on
  // an in-progress shift for this participant, plus any workers linked to them, so
  // the care station always has someone to tap. Each worker also carries the shiftId
  // (for WORKER check-ins, which route to billing/EVV) and accessGrantId (for
  // family/guardian presence).
  let workers: HubWorker[] = [];
  try {
    const [inProgress, links, grants] = await Promise.all([
      prisma.shift.findMany({
        where: { participantId: participant.id, status: "IN_PROGRESS", allocatedToId: { not: null } },
        select: { id: true, allocatedToId: true },
      }),
      prisma.workerParticipant.findMany({
        where: { participantId: participant.id },
        select: { worker: { select: { id: true, name: true, organisationId: true, pinSetAt: true } } },
      }),
      prisma.participantAccessGrant.findMany({
        where: { participantId: participant.id, status: "ACTIVE" },
        select: { id: true, principalId: true, role: true },
      }),
    ]);

    const shiftByWorker = new Map<string, string>();
    for (const s of inProgress) if (s.allocatedToId) shiftByWorker.set(s.allocatedToId, s.id);

    // A grant whose role names "family"/"guardian" makes that actor's capacity ambiguous
    // (they may be here as a worker OR as family) — the client shows the capacity pick.
    const grantByWorker = new Map<string, { id: string; family: boolean }>();
    for (const g of grants) {
      grantByWorker.set(g.principalId, {
        id: g.id,
        family: /family|guardian/i.test(g.role),
      });
    }

    const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } });
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));

    const seen = new Set<string>();
    const rows: HubWorker[] = [];
    for (const l of links) {
      const w = l.worker;
      if (!w || seen.has(w.id)) continue;
      seen.add(w.id);
      const shiftId = shiftByWorker.get(w.id) ?? null;
      const grant = grantByWorker.get(w.id) ?? null;
      rows.push({
        id: w.id,
        name: w.name,
        org: (w.organisationId && orgName.get(w.organisationId)) || "Solo",
        onShift: shiftId !== null,
        hasPin: w.pinSetAt !== null,
        shiftId,
        accessGrantId: grant?.id ?? null,
        // Ambiguous when they hold a family/guardian grant AND could also be on shift.
        ambiguous: !!grant?.family,
      });
    }
    // On-shift workers first, then the rest.
    rows.sort((a, b) => Number(b.onShift) - Number(a.onShift));
    workers = rows;
  } catch {
    workers = [];
  }

  const onShiftCount = workers.filter((w) => w.onShift).length;

  // The unified, cross-org, consent-gated timeline (grant-authorised read).
  const timelineRes = await participantHubTimeline({ participantId: participant.id, limit: 50 });
  let timeline: HubTimelineItem[] = [];
  let timelineError: string | null = null;
  if (timelineRes.ok) {
    const workerById = new Map(workers.map((w) => [w.id, w]));
    timeline = timelineRes.entries.map((e) => {
      const w = e.loggedByWorkerId ? workerById.get(e.loggedByWorkerId) : undefined;
      return {
        id: e.id,
        actorName: w?.name ?? "Someone",
        org: w?.org ?? "",
        capacity: (e.actingCapacity as HubTimelineItem["capacity"]) ?? "WORKER",
        category: e.category,
        summary: e.notes || e.detail || "",
        timestamp: e.timestamp,
      };
    });
  } else {
    timelineError = timelineRes.error;
  }

  return (
    <HubClient
      participantId={participant.id}
      participantName={participant.name}
      sessionId={sessionId}
      sessionError={sessionError}
      workers={workers}
      onShiftCount={onShiftCount}
      timeline={timeline}
      timelineError={timelineError}
    />
  );
}
