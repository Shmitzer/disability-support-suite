// shifts.ts — reads a worker's shifts from the database and sorts them into the
// pieces the worker homepage needs: the three status cards, the list of
// auctioned shifts they can accept, and a flat list for the calendar.
//
// Keeping the database queries here (out of the page) means the page just
// renders, and this logic can be tested/changed in one place.

import { prisma } from "@/lib/prisma";

// A lightweight, fully-serialisable shape for the calendar. (Dates become ISO
// strings so they can cross from this server code to the client calendar.)
export type CalendarShift = {
  id: string;
  status: string;
  participantName: string;
  location: string | null;
  start: string; // ISO
  end: string; // ISO
  mine: boolean; // allocated to the current worker (vs an open auction)
};

// Everything the worker homepage shows, gathered in one call.
export async function getWorkerHome(workerId: string) {
  const now = new Date();

  // All shifts assigned to this worker, plus the participant on each and this
  // worker's own clock-time amendment requests (so the timesheet can show
  // "pending approval" instead of offering the form again).
  const myShifts = await prisma.shift.findMany({
    where: { allocatedToId: workerId },
    include: {
      participant: true,
      amendments: {
        where: { requestedById: workerId },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });

  // Last completed shift — most recently finished.
  const lastShift =
    myShifts
      .filter((s) => s.status === "COMPLETED")
      .sort((a, b) => b.scheduledEnd.getTime() - a.scheduledEnd.getTime())[0] ??
    null;

  // Upcoming = in progress or allocated and not yet finished, soonest first.
  const upcoming = myShifts
    .filter(
      (s) =>
        (s.status === "IN_PROGRESS" || s.status === "ALLOCATED") &&
        s.scheduledEnd >= now,
    )
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

  const currentShift = upcoming[0] ?? null; // happening now / next up
  const nextShift = upcoming[1] ?? null; // the one after that

  // Auctioned shifts this worker is allowed to see: status OFFERED, for a
  // participant they're linked to, and which they haven't already declined.
  const links = await prisma.workerParticipant.findMany({
    where: { workerId },
    select: { participantId: true },
  });
  const participantIds = links.map((l) => l.participantId);

  const offered =
    participantIds.length > 0
      ? await prisma.shift.findMany({
          where: {
            status: "OFFERED",
            participantId: { in: participantIds },
            // Hide any this worker has already passed on (audit-log driven).
            events: { none: { type: "DECLINED", actorId: workerId } },
          },
          include: { participant: true },
          orderBy: { scheduledStart: "asc" },
        })
      : [];

  // Flat list for the calendar: my shifts (any status) + the open auctions.
  const calendarShifts: CalendarShift[] = [
    ...myShifts.map((s) => toCalendarShift(s, true)),
    ...offered.map((s) => toCalendarShift(s, false)),
  ];

  // Timesheet: shifts the worker has worked (in progress or completed), newest
  // first. This is where clock times live and where a correction/missing-time
  // request is made. Anything with a missing clock time floats to the top.
  const timesheet = myShifts
    .filter((s) => s.status === "IN_PROGRESS" || s.status === "COMPLETED")
    .sort((a, b) => {
      const aMissing = !a.clockOnAt || !a.clockOffAt ? 0 : 1;
      const bMissing = !b.clockOnAt || !b.clockOffAt ? 0 : 1;
      if (aMissing !== bMissing) return aMissing - bMissing; // missing first
      return b.scheduledStart.getTime() - a.scheduledStart.getTime(); // newest first
    })
    .slice(0, 6);

  return { lastShift, currentShift, nextShift, offered, calendarShifts, timesheet, now };
}

// Narrow a full shift row down to the serialisable calendar shape.
function toCalendarShift(
  s: {
    id: string;
    status: string;
    location: string | null;
    scheduledStart: Date;
    scheduledEnd: Date;
    participant: { name: string };
  },
  mine: boolean,
): CalendarShift {
  return {
    id: s.id,
    status: s.status,
    participantName: s.participant.name,
    location: s.location,
    start: s.scheduledStart.toISOString(),
    end: s.scheduledEnd.toISOString(),
    mine,
  };
}
