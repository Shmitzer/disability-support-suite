// /shift/[id] — the shift details page: live tracker (task 1f) + end-of-shift
// AI report (task 1g).
//
// This is where a worker spends the shift: it shows the shift's details, the
// quick-capture chips (while the shift is running), the live timeline of what's
// been logged, a "Finish shift" button, and — once finished — the AI report.
// The URL carries the shift id, e.g. /shift/abc123.
//
// Server component: it reads the database for this one shift, checks the viewer
// is allowed to see it, then renders. The interactive pieces (chip strip, report
// button) are client components.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentWorker } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clockOff } from "@/lib/clock-actions";
import { ShiftTracker } from "@/components/ShiftTracker";
import { ShiftTimeline } from "@/components/ShiftTimeline";
import { ReportPanel } from "@/components/ReportPanel";

// Always read fresh data — the timeline changes as entries are added.
export const dynamic = "force-dynamic";

export default async function ShiftPage({ params }: { params: Promise<{ id: string }> }) {
  // In this version of Next, params is a promise — we await it to get the id.
  const { id } = await params;
  const worker = await getCurrentWorker();
  if (!worker) notFound();

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      participant: true,
      entries: { orderBy: { timestamp: "asc" } },
      // The newest report only — regenerating just adds a fresh row on top.
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!shift) notFound();

  // You can view a shift if it's yours, or you're rostering staff. Otherwise it's
  // not your business to see.
  const isOwner = shift.allocatedToId === worker.id;
  if (!isOwner && worker.role !== "ROSTERING") notFound();

  // Logging is allowed only on your own shift, and only while it's running.
  const canLog = isOwner && shift.status === "IN_PROGRESS";
  // The report step is for your own, finished shift.
  const canReport = isOwner && shift.status === "COMPLETED";
  const latestReport = shift.reports[0] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        ← Back
      </Link>

      {/* Shift details, pulled forward from the shift itself. */}
      <header className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {shift.participant.name}
          </h1>
          <StatusBadge status={shift.status} />
        </div>
        <p className="text-sm text-zinc-600">{formatDay(shift.scheduledStart)}</p>
        <p className="text-sm text-zinc-600">
          {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
        </p>
        {shift.location && <p className="text-sm text-zinc-500">{shift.location}</p>}
      </header>

      {/* Capture chips — only while the shift is in progress and it's yours. */}
      {canLog ? (
        <ShiftTracker shiftId={shift.id} />
      ) : (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          {shift.status === "ALLOCATED"
            ? "Clock on from the home screen to start logging."
            : shift.status === "COMPLETED"
              ? "This shift is finished — the log is locked."
              : "Logging isn't available for this shift."}
        </p>
      )}

      {/* The live timeline (also shows the clock-on/off milestones). */}
      <ShiftTimeline
        clockOnAt={shift.clockOnAt}
        clockOffAt={shift.clockOffAt}
        entries={shift.entries}
        editable={canLog}
      />

      {/* Finish the shift right here — clocking off completes it and unlocks the
          report step below. */}
      {canLog && (
        <form action={clockOff}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <button className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100">
            Finish shift (clock off)
          </button>
        </form>
      )}

      {/* End-of-shift AI report (task 1g) — once the shift is finished. */}
      {canReport && (
        <ReportPanel
          shiftId={shift.id}
          summary={latestReport?.summary ?? null}
          generatedAt={latestReport?.createdAt ?? null}
        />
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
        Development build · sample data only · do not enter real participant information
      </footer>
    </main>
  );
}

// A small coloured label for the shift's current status.
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "IN_PROGRESS"
      ? "bg-green-100 text-green-700"
      : status === "COMPLETED"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-blue-100 text-blue-700";
  const label = status.replace("_", " ").toLowerCase();
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {label}
    </span>
  );
}

// --- Date helpers (en-AU), matching the rest of the app --------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}
