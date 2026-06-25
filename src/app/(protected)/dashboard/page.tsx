// The home page = the worker's shift dashboard (role-aware).
// Runs on the server: it reads who's "logged in" (dev role-switch) and shows
// either the worker homepage (3 status cards + auctions + calendar) or, for
// rostering staff, a short placeholder until the roster side is built (1d).

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentSector } from "@/lib/session";
import { isRosteringRole } from "@/lib/enums";
import { sectorLabels } from "@/lib/sector-config";
import { getWorkerHome } from "@/lib/shifts";
import { getRosterData } from "@/lib/roster";
import CairaEmpty from "@/components/caira/CairaEmpty";
import { tenantScope } from "@/lib/tenant";
import { acceptShift, declineShift } from "@/lib/shift-actions";
import { clockOn, clockOff } from "@/lib/clock-actions";
import { WorkerCalendar } from "@/components/WorkerCalendar";
import { RosterView } from "@/components/RosterView";
import { Timesheet } from "@/components/Timesheet";
import { QuickShiftStarter } from "@/components/QuickShiftStarter";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

// A shift row as returned with its participant included.
type ShiftRow = {
  id: string;
  status: string;
  location: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  clockOnAt: Date | null;
  clockOffAt: Date | null;
  participant: { name: string };
};

export default async function Home() {
  const worker = await getCurrentUser();

  if (!worker) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16">
        <CairaEmpty
          message="No worker found"
          submessage="Run the seed script to add sample data."
        />
      </main>
    );
  }

  // Sector terminology for this user's organisation (Rule 4).
  const sector = await getCurrentSector();
  const labels = sectorLabels(sector);

  // Rostering staff get the roster dashboard: create / allocate / auction /
  // cancel shifts, every step audit-logged.
  if (isRosteringRole(worker.role)) {
    const rosterData = await getRosterData(worker);
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-1">
          <p className="text-sm font-medium text-blue-600">Rostering</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Hi {worker.name.split(" ")[0]}
          </h1>
          <Link href="/billing" className="text-sm font-medium text-blue-600 hover:underline">
            Billing &amp; subscription →
          </Link>
        </header>

        <RosterView
          participants={rosterData.participants}
          shifts={rosterData.shifts}
          linkedWorkers={rosterData.linkedWorkers}
          amendments={rosterData.amendments}
          sector={sector}
        />

        <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
          Development build · sample data only · do not enter real {labels.participant} information
        </footer>
      </main>
    );
  }

  const { lastShift, currentShift, nextShift, offered, calendarShifts, timesheet, now } =
    await getWorkerHome(worker.id);

  // The sample people for the quick-shift dropdown (sorted by name).
  const participants = await prisma.participant.findMany({
    where: tenantScope(worker),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-blue-600">Your shifts</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Hi {worker.name.split(" ")[0]}
        </h1>
      </header>

      {/* Start logging straight away, without a rostered shift (standalone use). */}
      <QuickShiftStarter participants={participants} sector={sector} />

      {/* Three status cards. The middle one carries the clock on/off controls.
          Stacked on phones/tablets; three-up only on wide screens, so the
          portrait + details always have room (avoids cramped wrapping). */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ShiftCard label="Last completed" shift={lastShift} />
        <CurrentShiftCard shift={currentShift} now={now} />
        <ShiftCard label="Next allocated" shift={nextShift} />
      </section>

      {/* Auctioned shifts the worker can accept */}
      {offered.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Available shifts
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {offered.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {offered.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm"
              >
                {/* Same detail layout as the status cards: text left, portrait right. */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-zinc-900">{s.participant.name}</span>
                      <StatusPill status="OFFERED" />
                    </div>
                    <DetailLine icon={<IconCalendar />}>{formatDay(s.scheduledStart)}</DetailLine>
                    <DetailLine icon={<IconClock />}>
                      {formatTime(s.scheduledStart)} – {formatTime(s.scheduledEnd)}
                    </DetailLine>
                    {s.location && <DetailLine icon={<IconPin />}>{s.location}</DetailLine>}
                  </div>
                  <ParticipantAvatar name={s.participant.name} />
                </div>
                {/* Full-width buttons so they're easy to tap one-handed. */}
                <div className="flex gap-2">
                  <form action={acceptShift} className="flex-1">
                    <input type="hidden" name="shiftId" value={s.id} />
                    <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                      Accept
                    </button>
                  </form>
                  <form action={declineShift} className="flex-1">
                    <input type="hidden" name="shiftId" value={s.id} />
                    <button className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100">
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Timesheet: clock times + add/correct (manager-approved) */}
      <Timesheet shifts={timesheet} />

      {/* Calendar */}
      <WorkerCalendar shifts={calendarShifts} />

      <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
        Development build · sample data only · do not enter real {labels.participant} information
      </footer>
    </main>
  );
}

// One status card (Last completed / Next allocated). Placeholder when empty.
function ShiftCard({ label, shift }: { label: string; shift: ShiftRow | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <CardHeading label={label} status={shift?.status} />
      {shift ? <ShiftDetails shift={shift} /> : <EmptyState />}
    </div>
  );
}

// The "Current / upcoming" card — visually primary (soft blue) because it
// carries the action (clock on/off + the link into the shift).
function CurrentShiftCard({ shift, now }: { shift: ShiftRow | null; now: Date }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm ring-1 ring-inset ring-blue-100">
      <CardHeading label="Current / upcoming" status={shift?.status} primary />
      {shift ? (
        <div className="flex flex-col gap-3">
          <ShiftDetails shift={shift} />
          <ClockControls shift={shift} now={now} />
          {/* Into the shift details + live tracker (task 1f). */}
          <Link
            href={`/shift/${shift.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            {shift.status === "IN_PROGRESS" ? "Open tracker →" : "View shift →"}
          </Link>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

// The card's top row: a small label on the left, a status pill on the right.
function CardHeading({
  label,
  status,
  primary,
}: {
  label: string;
  status?: string;
  primary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          primary ? "text-blue-700/70" : "text-zinc-400"
        }`}
      >
        {label}
      </p>
      {status && <StatusPill status={status} />}
    </div>
  );
}

// The shift's details — defined once so every card shows them identically.
// The participant portrait sits to the right of the text.
function ShiftDetails({ shift }: { shift: ShiftRow }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-base font-semibold text-zinc-900">{shift.participant.name}</span>
        <DetailLine icon={<IconCalendar />}>{formatDay(shift.scheduledStart)}</DetailLine>
        <DetailLine icon={<IconClock />}>
          {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
        </DetailLine>
        {shift.location && <DetailLine icon={<IconPin />}>{shift.location}</DetailLine>}
      </div>
      <ParticipantAvatar name={shift.participant.name} />
    </div>
  );
}

// One line of detail: a small grey icon + its text.
function DetailLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-zinc-600">
      {icon}
      {children}
    </span>
  );
}

function EmptyState() {
  return <p className="text-sm text-zinc-400">Nothing here yet.</p>;
}

// A small colour-coded badge for the shift's status, so state reads at a glance.
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    IN_PROGRESS: { label: "On shift now", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    ALLOCATED: { label: "Scheduled", cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" },
    OFFERED: { label: "Available", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
    CANCELLED: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  };
  const s = styles[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

// --- Small inline icons (no icon library) ----------------------------------
// Shared style: thin grey strokes, sized to sit beside a line of text.

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// Clock on / clock off, shown for the current shift only when allowed:
//  • ALLOCATED   → "Clock on" from 10 min before the start (else a hint).
//  • IN_PROGRESS → "Clock off" (which completes the shift).
function ClockControls({ shift, now }: { shift: ShiftRow; now: Date }) {
  const WINDOW_MS = 10 * 60_000; // matches CLOCK_ON_WINDOW_MINUTES on the server

  if (shift.status === "IN_PROGRESS") {
    return (
      <div className="flex flex-col gap-1.5 border-t border-blue-100 pt-2">
        {shift.clockOnAt && (
          <span className="text-xs text-zinc-500">Clocked on at {formatTime(shift.clockOnAt)}</span>
        )}
        <form action={clockOff}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            Clock off
          </button>
        </form>
      </div>
    );
  }

  if (shift.status === "ALLOCATED") {
    const opensAt = new Date(shift.scheduledStart.getTime() - WINDOW_MS);
    const canClockOn = now >= opensAt;
    return (
      <div className="flex flex-col gap-1.5 border-t border-blue-100 pt-2">
        {canClockOn ? (
          <form action={clockOn}>
            <input type="hidden" name="shiftId" value={shift.id} />
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Clock on
            </button>
          </form>
        ) : (
          <span className="text-xs text-zinc-500">
            Clock on available from {formatTime(opensAt)}
          </span>
        )}
      </div>
    );
  }

  return null;
}

// --- Date formatting (en-AU) -----------------------------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
