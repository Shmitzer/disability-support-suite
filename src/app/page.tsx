// The home page = the worker's shift dashboard.
// Runs on the server: it reads who's "logged in" (dev role-switch) and shows
// either the worker homepage (3 status cards + auctions + calendar) or, for
// rostering staff, a short placeholder until the roster side is built (1d).

import Link from "next/link";
import { getCurrentWorker } from "@/lib/session";
import { getWorkerHome } from "@/lib/shifts";
import { getRosterData } from "@/lib/roster";
import { acceptShift, declineShift } from "@/lib/shift-actions";
import { clockOn, clockOff } from "@/lib/clock-actions";
import { WorkerCalendar } from "@/components/WorkerCalendar";
import { RosterView } from "@/components/RosterView";
import { Timesheet } from "@/components/Timesheet";

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
  const worker = await getCurrentWorker();

  if (!worker) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16 text-center text-zinc-600">
        No worker found. Run the seed script to add sample data.
      </main>
    );
  }

  // Rostering staff get the roster dashboard: create / allocate / auction /
  // cancel shifts, every step audit-logged.
  if (worker.role === "ROSTERING") {
    const rosterData = await getRosterData();
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-blue-600">Rostering</p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Hi {worker.name.split(" ")[0]}
            </h1>
          </div>
          <Link
            href="/notes"
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm hover:bg-zinc-50"
          >
            Notes →
          </Link>
        </header>

        <RosterView
          participants={rosterData.participants}
          shifts={rosterData.shifts}
          linkedWorkers={rosterData.linkedWorkers}
          amendments={rosterData.amendments}
        />

        <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
          Development build · sample data only · do not enter real participant information
        </footer>
      </main>
    );
  }

  const { lastShift, currentShift, nextShift, offered, calendarShifts, timesheet, now } =
    await getWorkerHome(worker.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-blue-600">Your shifts</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Hi {worker.name.split(" ")[0]}
          </h1>
        </div>
        <Link
          href="/notes"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm hover:bg-zinc-50"
        >
          Notes →
        </Link>
      </header>

      {/* Three status cards. The middle one carries the clock on/off controls. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ShiftCard label="Last completed" shift={lastShift} tone="neutral" />
        <CurrentShiftCard shift={currentShift} now={now} />
        <ShiftCard label="Next allocated" shift={nextShift} tone="neutral" />
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
                className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-zinc-900">{s.participant.name}</span>
                  <span className="text-sm text-zinc-600">{formatWhen(s.scheduledStart, s.scheduledEnd)}</span>
                  {s.location && <span className="text-sm text-zinc-500">{s.location}</span>}
                </div>
                <div className="flex gap-2">
                  <form action={acceptShift}>
                    <input type="hidden" name="shiftId" value={s.id} />
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                      Accept
                    </button>
                  </form>
                  <form action={declineShift}>
                    <input type="hidden" name="shiftId" value={s.id} />
                    <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100">
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
        Development build · sample data only · do not enter real participant information
      </footer>
    </main>
  );
}

// One status card. Shows a placeholder when there's no shift to show.
function ShiftCard({
  label,
  shift,
  tone,
}: {
  label: string;
  shift: ShiftRow | null;
  tone: "primary" | "neutral";
}) {
  const ring =
    tone === "primary"
      ? "border-blue-200 bg-blue-50/50"
      : "border-zinc-200 bg-white";

  return (
    <div className={`flex flex-col gap-2 rounded-2xl border ${ring} p-4 shadow-sm`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      {shift ? (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-900">{shift.participant.name}</span>
          <span className="text-sm text-zinc-600">{formatDay(shift.scheduledStart)}</span>
          <span className="text-sm text-zinc-600">
            {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
          </span>
          {shift.location && <span className="text-sm text-zinc-500">{shift.location}</span>}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">Nothing here yet.</p>
      )}
    </div>
  );
}

// The "Current / upcoming" card, with the clock on/off controls attached.
function CurrentShiftCard({ shift, now }: { shift: ShiftRow | null; now: Date }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Current / upcoming</p>
      {shift ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-900">{shift.participant.name}</span>
            <span className="text-sm text-zinc-600">{formatDay(shift.scheduledStart)}</span>
            <span className="text-sm text-zinc-600">
              {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
            </span>
            {shift.location && <span className="text-sm text-zinc-500">{shift.location}</span>}
          </div>
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
        <p className="text-sm text-zinc-400">Nothing here yet.</p>
      )}
    </div>
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

function formatWhen(start: Date, end: Date): string {
  return `${formatDay(start)} · ${formatTime(start)} – ${formatTime(end)}`;
}
