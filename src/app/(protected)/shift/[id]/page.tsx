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
import { getCurrentUser, getCurrentSector } from "@/lib/session";
import { isRosteringRole } from "@/lib/enums";
import { sectorLabels } from "@/lib/sector-config";
import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/tenant";
import { clockOff } from "@/lib/clock-actions";
import { ShiftTracker } from "@/components/ShiftTracker";
import { ShiftTimeline } from "@/components/ShiftTimeline";
import { ReportPanel } from "@/components/ReportPanel";
import { buildShiftSourceLog } from "@/lib/report";
import { getApprovedOptions } from "@/lib/learned-options";
import { LOG_CATEGORIES } from "@/lib/log-categories";
import { signStoredPhotos } from "@/lib/storage";

// Always read fresh data — the timeline changes as entries are added.
export const dynamic = "force-dynamic";

export default async function ShiftPage({ params }: { params: Promise<{ id: string }> }) {
  // In this version of Next, params is a promise — we await it to get the id.
  const { id } = await params;
  const worker = await getCurrentUser();
  if (!worker) notFound();
  const labels = sectorLabels(await getCurrentSector());

  // Tenant-scoped fetch: even a rostering-role user can only open a shift in their
  // own org — a cross-org admin gets notFound() instead of another tenant's data.
  const shift = await prisma.shift.findFirst({
    where: { id, ...tenantScope(worker) },
    include: {
      participant: true,
      allocatedTo: true, // the worker — included so the copied log names them
      entries: { orderBy: { timestamp: "asc" } },
      // The newest report only — regenerating just adds a fresh row on top.
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!shift) notFound();

  // You can view a shift if it's yours, or you're rostering staff. Otherwise it's
  // not your business to see.
  const isOwner = shift.allocatedToId === worker.id;
  if (!isOwner && !isRosteringRole(worker.role)) notFound();

  // Logging is allowed only on your own shift, and only while it's running.
  const canLog = isOwner && shift.status === "IN_PROGRESS";
  // The report step is for your own, finished shift.
  const canReport = isOwner && shift.status === "COMPLETED";
  const latestReport = shift.reports[0] ?? null;
  // The whole shift as plain text, for the copy-to-clipboard buttons.
  const logText = buildShiftSourceLog(shift);

  // Resolve each entry's stored photos (relative paths) into signed display URLs for
  // the timeline. Legacy inline data URLs pass through; a no-op when Storage isn't
  // configured (the stored values are still inline data URLs).
  const timelineEntries = await Promise.all(
    shift.entries.map(async (e) => ({ ...e, photos: await signStoredPhotos(e.photos) })),
  );

  // Approved options for every self-learning group (drink, activity, …), keyed by
  // group key. Grows as workers log new ones; falls back to the seed list in config
  // if the DB has none yet.
  const learnedGroups = LOG_CATEGORIES.flatMap((c) => c.groups ?? []).filter((g) => g.learn);
  const learnedOptions: Record<string, string[]> = {};
  for (const g of learnedGroups) {
    const approved = await getApprovedOptions(g.key);
    learnedOptions[g.key] = approved.length > 0 ? approved : g.options;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
        ← Back
      </Link>

      {/* Shift details, pulled forward from the shift itself. */}
      <header className="flex flex-col gap-2 rounded-2xl border border-border bg-brand-tint p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {shift.participant.name}
          </h1>
          <StatusBadge status={shift.status} />
        </div>
        <p className="text-sm text-muted">{formatDay(shift.scheduledStart)}</p>
        <p className="text-sm text-muted">
          {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
        </p>
        {shift.location && <p className="text-sm text-muted">{shift.location}</p>}
      </header>

      {/* Capture chips — only while the shift is in progress and it's yours. */}
      {canLog ? (
        <ShiftTracker shiftId={shift.id} learnedOptions={learnedOptions} />
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
        entries={timelineEntries}
        editable={canLog}
        logText={logText}
        learnedOptions={learnedOptions}
      />

      {/* Finish the shift right here — clocking off completes it and unlocks the
          report step below. */}
      {canLog && (
        <form action={clockOff}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <button className="w-full rounded-xl bg-brand px-4 py-3 text-base font-medium text-white transition-colors hover:bg-brand-strong">
            Finish shift (clock off)
          </button>
        </form>
      )}

      {/* End-of-shift AI report (1g) + approval flow (1i) — once finished. */}
      {canReport && (
        <ReportPanel
          shiftId={shift.id}
          summary={latestReport?.summary ?? null}
          status={latestReport?.status ?? "DRAFT"}
          questions={parseJsonArray<string>(latestReport?.questions ?? null)}
          clarifications={parseJsonArray<{ q: string; a: string }>(
            latestReport?.clarifications ?? null,
          )}
          approvedAt={latestReport?.approvedAt ?? null}
          generatedAt={latestReport?.createdAt ?? null}
          logText={logText}
        />
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
        Development build · sample data only · do not enter real {labels.participant} information
      </footer>
    </main>
  );
}

// Safely parse a JSON-array column (questions / clarifications) into an array.
function parseJsonArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
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
