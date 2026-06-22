// seed.ts — fills the database with SAMPLE (made-up) data to develop against.
// Run with:  npx tsx prisma/seed.ts
// Never put real participant data here.

import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- People ----------------------------------------------------------------

const sampleParticipants = [
  { name: "Jordan Mitchell", ndisNumber: "430000001" },
  { name: "Priya Sharma", ndisNumber: "430000002" },
  { name: "Liam O'Brien", ndisNumber: "430000003" },
];

// One demo tenant so the multi-tenant columns are populated from day one.
const DEMO_ORG_ID = "org_demo";

// Fixed worker ids so the dev role-switch can refer to them reliably.
// Roles use the 6-value set (see src/lib/enums.ts); the old "ROSTERING" role is
// now ADMIN.
const sampleWorkers = [
  { id: "wkr_edward", name: "Edward Neppl", role: Role.WORKER },
  { id: "wkr_sam", name: "Sam Taylor", role: Role.WORKER },
  { id: "wkr_roster", name: "Alex Rivera", role: Role.ADMIN },
];

// --- Date helpers ----------------------------------------------------------
// Returns a real Date offset from "now" — e.g. at(-1, 9) = yesterday 09:00.
function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Returns a Date a number of minutes from right now. Used to make a shift that's
// about to start, so the "Clock on" button (open from 10 min before) is testable
// whenever the seed is run.
function soon(minutesFromNow: number): Date {
  return new Date(Date.now() + minutesFromNow * 60_000);
}

async function main() {
  // Clear the shift-lifecycle tables so re-running the seed is repeatable.
  // (Participants are upserted below, so existing progress notes survive.)
  await prisma.clockAmendmentRequest.deleteMany();
  await prisma.shiftEvent.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.workerParticipant.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.organisation.deleteMany();

  // The demo tenant. Every worker/participant below is attached to it so the
  // organisationId columns are exercised even before real multi-tenancy lands.
  await prisma.organisation.upsert({
    where: { id: DEMO_ORG_ID },
    update: { name: "Demo Care", sectorMode: "NDIS" },
    create: { id: DEMO_ORG_ID, name: "Demo Care", sectorMode: "NDIS" },
  });

  // Participants (keep any that already exist).
  for (const p of sampleParticipants) {
    await prisma.participant.upsert({
      where: { ndisNumber: p.ndisNumber },
      update: { name: p.name, organisationId: DEMO_ORG_ID },
      create: { ...p, organisationId: DEMO_ORG_ID },
    });
  }

  // Workers.
  for (const w of sampleWorkers) {
    await prisma.worker.create({ data: { ...w, organisationId: DEMO_ORG_ID } });
  }

  // Look up participant ids by their NDIS number.
  const jordan = await prisma.participant.findUniqueOrThrow({ where: { ndisNumber: "430000001" } });
  const priya = await prisma.participant.findUniqueOrThrow({ where: { ndisNumber: "430000002" } });
  const liam = await prisma.participant.findUniqueOrThrow({ where: { ndisNumber: "430000003" } });

  // Manager-made links — who can see which participant's auctioned shifts.
  // Edward ↔ Jordan, Priya   |   Sam ↔ Priya, Liam
  const links = [
    { workerId: "wkr_edward", participantId: jordan.id },
    { workerId: "wkr_edward", participantId: priya.id },
    { workerId: "wkr_sam", participantId: priya.id },
    { workerId: "wkr_sam", participantId: liam.id },
  ];
  for (const l of links) {
    await prisma.workerParticipant.create({ data: l });
  }

  // Shifts — built around Edward so his homepage has a last/current/next to show.

  // 1) COMPLETED — yesterday, worked by Edward (the "last shift" card).
  await prisma.shift.create({
    data: {
      status: "COMPLETED",
      participantId: jordan.id,
      location: "Participant's home — Newcastle",
      createdById: "wkr_roster",
      allocatedToId: "wkr_edward",
      scheduledStart: at(-1, 9),
      scheduledEnd: at(-1, 13),
      clockOnAt: at(-1, 8, 58),
      clockOffAt: at(-1, 13, 5),
      allocatedAt: at(-3, 10),
      createdAt: at(-4, 9),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(-4, 9) },
          { type: "ALLOCATED", actorId: "wkr_roster", detail: "Allocated to Edward Neppl", createdAt: at(-3, 10) },
          { type: "CLOCK_ON", actorId: "wkr_edward", createdAt: at(-1, 8, 58) },
          { type: "CLOCK_OFF", actorId: "wkr_edward", createdAt: at(-1, 13, 5) },
        ],
      },
    },
  });

  // 2) ALLOCATED — starting in ~5 minutes, Edward's current shift. Because the
  //    clock-on window opens 10 min before the start, the "Clock on" button is
  //    available the moment you load the homepage as Edward.
  await prisma.shift.create({
    data: {
      status: "ALLOCATED",
      participantId: priya.id,
      location: "Community access — Charlestown Square",
      createdById: "wkr_roster",
      allocatedToId: "wkr_edward",
      scheduledStart: soon(5),
      scheduledEnd: soon(5 + 240), // a 4-hour shift
      allocatedAt: at(-1, 11),
      createdAt: at(-2, 9),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(-2, 9) },
          { type: "ALLOCATED", actorId: "wkr_roster", detail: "Allocated to Edward Neppl", createdAt: at(-1, 11) },
        ],
      },
    },
  });

  // 3) ALLOCATED — tomorrow, Edward's next shift (the "next allocated" card).
  await prisma.shift.create({
    data: {
      status: "ALLOCATED",
      participantId: jordan.id,
      location: "Participant's home — Newcastle",
      createdById: "wkr_roster",
      allocatedToId: "wkr_edward",
      scheduledStart: at(1, 9),
      scheduledEnd: at(1, 13),
      allocatedAt: at(0, 8),
      createdAt: at(-1, 15),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(-1, 15) },
          { type: "ALLOCATED", actorId: "wkr_roster", detail: "Allocated to Edward Neppl", createdAt: at(0, 8) },
        ],
      },
    },
  });

  // 4) OFFERED — up for auction. Visible to workers linked to Priya (Edward & Sam).
  await prisma.shift.create({
    data: {
      status: "OFFERED",
      participantId: priya.id,
      location: "Community access — Lake Macquarie",
      createdById: "wkr_roster",
      scheduledStart: at(2, 10),
      scheduledEnd: at(2, 14),
      createdAt: at(0, 9),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(0, 9) },
          { type: "OFFERED", actorId: "wkr_roster", detail: "Offered to workers linked to Priya Sharma", createdAt: at(0, 9) },
        ],
      },
    },
  });

  // 5) CANCELLED — last week. Kept for reporting (shows in the audit trail).
  await prisma.shift.create({
    data: {
      status: "CANCELLED",
      participantId: liam.id,
      location: "Participant's home — Maitland",
      createdById: "wkr_roster",
      scheduledStart: at(-7, 9),
      scheduledEnd: at(-7, 13),
      cancelledAt: at(-8, 16),
      cancelReason: "Participant admitted to hospital",
      createdAt: at(-9, 9),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(-9, 9) },
          { type: "CANCELLED", actorId: "wkr_roster", detail: "Participant admitted to hospital", createdAt: at(-8, 16) },
        ],
      },
    },
  });

  // 6) COMPLETED but missing its clock-off — Edward clocked on two days ago and
  //    forgot to clock off. The homepage timesheet shows a "missing" prompt so
  //    he can request the time (which a manager then approves).
  await prisma.shift.create({
    data: {
      status: "COMPLETED",
      participantId: priya.id,
      location: "Community access — Charlestown Square",
      createdById: "wkr_roster",
      allocatedToId: "wkr_edward",
      scheduledStart: at(-2, 9),
      scheduledEnd: at(-2, 13),
      clockOnAt: at(-2, 9, 2),
      clockOffAt: null, // forgot to clock off
      allocatedAt: at(-4, 10),
      createdAt: at(-5, 9),
      events: {
        create: [
          { type: "CREATED", actorId: "wkr_roster", createdAt: at(-5, 9) },
          { type: "ALLOCATED", actorId: "wkr_roster", detail: "Allocated to Edward Neppl", createdAt: at(-4, 10) },
          { type: "CLOCK_ON", actorId: "wkr_edward", createdAt: at(-2, 9, 2) },
        ],
      },
    },
  });

  const counts = {
    participants: await prisma.participant.count(),
    workers: await prisma.worker.count(),
    shifts: await prisma.shift.count(),
    events: await prisma.shiftEvent.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
