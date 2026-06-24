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

  // The live timeline (clock on/off milestones + logged entries). Rendered inside the
  // tracker's Timeline tab while logging, or on its own once the shift is finished.
  const timelineEl = (
    <ShiftTimeline
      clockOnAt={shift.clockOnAt}
      clockOffAt={shift.clockOffAt}
      entries={timelineEntries}
      editable={canLog}
      logText={logText}
      learnedOptions={learnedOptions}
    />
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pb-8 pt-4">
      {/* Caira app bar: wordmark + (mock) On-call */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-brand">
            <CairaMark />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-brand">Caira</span>
        </Link>
        {/* On-call is a visual placeholder for now (real calling is out of scope). */}
        <span className="flex h-9 items-center gap-2 rounded-full border border-[#efd5cb] bg-[#f7e7e0] py-0 pl-2 pr-3.5">
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-clay">
            <PhoneIcon />
          </span>
          <span className="text-[11px] font-extrabold tracking-wide text-[#bd6149]">On-call</span>
        </span>
      </div>

      {/* Participant card */}
      <div className="flex items-center gap-3.5 rounded-[20px] border border-border bg-surface p-3.5">
        <div className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[20px] border-2 border-white bg-[#e9dcc8] font-display text-2xl font-bold text-brand ring-2 ring-brand">
          {initialsOf(shift.participant.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl font-extrabold text-foreground">
            {shift.participant.name}
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted">
            Shift {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
          </div>
          <div className="mt-2">
            {shift.status === "IN_PROGRESS" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-bg px-2.5 py-1 text-[9px] font-bold tracking-wider text-status">
                <span className="h-[7px] w-[7px] rounded-full bg-status" aria-hidden />
                ON SHIFT{elapsedSince(shift.clockOnAt) ? ` · ${elapsedSince(shift.clockOnAt)} ELAPSED` : ""}
              </span>
            ) : (
              <StatusBadge status={shift.status} />
            )}
          </div>
        </div>
      </div>

      {/* Key contacts — visual placeholders (real contacts/calling are out of scope). */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Key contacts</div>
        <div className="flex gap-2.5">
          {KEY_CONTACTS.map((k) => (
            <div
              key={k.name}
              className="flex h-[74px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[15px] border border-border bg-surface px-1.5"
            >
              <span
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full font-display text-xs font-bold"
                style={{ background: k.tint, color: k.fg }}
              >
                {k.initials}
              </span>
              <span className="flex flex-col items-center">
                <span className="whitespace-nowrap text-[11px] font-bold text-foreground">{k.name}</span>
                <span className="whitespace-nowrap text-[9px] font-medium text-muted">{k.role}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Capture: the Caira tracker (Mic/Capture/Timeline) — only while the shift is
          running and it's yours. The Timeline tab renders the live shift history. */}
      {canLog ? (
        <ShiftTracker shiftId={shift.id} learnedOptions={learnedOptions} timeline={timelineEl} />
      ) : (
        <>
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {shift.status === "ALLOCATED"
              ? "Clock on from the home screen to start logging."
              : shift.status === "COMPLETED"
                ? "This shift is finished — the log is locked."
                : "Logging isn't available for this shift."}
          </p>
          {timelineEl}
        </>
      )}

      {/* Finish shift — pinned full-width action (clocking off completes the shift). */}
      {canLog && (
        <form action={clockOff} className="mt-1">
          <input type="hidden" name="shiftId" value={shift.id} />
          <button className="h-[54px] w-full rounded-2xl bg-brand text-[15px] font-extrabold tracking-wide text-white transition-colors hover:bg-brand-strong">
            FINISH SHIFT
          </button>
        </form>
      )}

      {/* End-of-shift AI report + approval flow — once finished. */}
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

      <footer className="mt-auto pt-4 text-center text-xs text-muted">
        Development build · sample data only · do not enter real {labels.participant} information
      </footer>
    </main>
  );
}

// Mock key contacts (visual only — matches the design; real contacts are out of scope).
const KEY_CONTACTS = [
  { initials: "SH", name: "S. Hale", role: "Coordinator", tint: "#dbe7e4", fg: "#0f766e" },
  { initials: "MD", name: "M. Doe", role: "Next of kin", tint: "#f1e2d6", fg: "#b06a4a" },
  { initials: "GP", name: "Dr Park", role: "GP", tint: "#e6e0ee", fg: "#6b5b95" },
];

// Caira logo mark: a heart with a "C" carved into the upper-left lobe (white on teal).
function CairaMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <path
        d="M32 49 C10 34 11 17 23 17 C28.5 17 31.5 21 32 24 C32.5 21 35.5 17 41 17 C53 17 54 34 32 49 Z"
        fill="#fff"
      />
      <path
        d="M29.5 18.5 A9 9 0 1 0 29.5 35.5"
        fill="none"
        stroke="#0f766e"
        strokeWidth="5.5"
        strokeLinecap="round"
        transform="rotate(-18 21 27)"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.1 2.2z" />
    </svg>
  );
}

// First-name + surname initials for the participant avatar.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// "HH:MM" elapsed since clock-on (for the ON SHIFT pill); null if not clocked on.
function elapsedSince(start: Date | null): string | null {
  if (!start) return null;
  const ms = Date.now() - start.getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
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
