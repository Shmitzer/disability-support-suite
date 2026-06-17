// RosterView.tsx — the rostering (manager) dashboard. Server component: it
// renders a "create shift" form and the list of all shifts, each with the
// actions allowed for its current status. The buttons are plain forms wired to
// the server actions in roster-actions.ts, so they work without client JS.

import {
  createShift,
  allocateShift,
  offerShift,
  cancelShift,
} from "@/lib/roster-actions";
import { approveAmendment, rejectAmendment } from "@/lib/clock-actions";

// How each status looks (Option A: calm, soft colours).
const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  OFFERED: "bg-amber-100 text-amber-700",
  ALLOCATED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  OFFERED: "Available (auction)",
  ALLOCATED: "Allocated",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Shapes of the data passed in (kept loose — this is a server component).
type Participant = { id: string; name: string };
type ShiftRow = {
  id: string;
  status: string;
  location: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  participantId: string;
  participant: { name: string };
  allocatedTo: { name: string } | null;
  events: { type: string; detail: string | null; createdAt: Date; actor: { name: string } | null }[];
};
type AmendmentRow = {
  id: string;
  field: string; // "clockOnAt" | "clockOffAt"
  proposedValue: Date;
  reason: string | null;
  requestedBy: { name: string };
  shift: {
    scheduledStart: Date;
    clockOnAt: Date | null;
    clockOffAt: Date | null;
    participant: { name: string };
  };
};

export function RosterView({
  participants,
  shifts,
  linkedWorkers,
  amendments,
}: {
  participants: Participant[];
  shifts: ShiftRow[];
  linkedWorkers: Record<string, { id: string; name: string }[]>;
  amendments: AmendmentRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* ---- Clock-time amendment requests (action these first) ---- */}
      {amendments.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Clock-time requests
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {amendments.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {amendments.map((a) => (
              <AmendmentCard key={a.id} amendment={a} />
            ))}
          </ul>
        </section>
      )}

      {/* ---- Create a shift ---- */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Create a shift</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-zinc-500">No participants yet — run the seed script.</p>
        ) : (
          <form action={createShift} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="participantId" className="text-sm font-medium text-zinc-700">
                Participant
              </label>
              <select
                id="participantId"
                name="participantId"
                required
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Date" htmlFor="date">
                <input type="date" id="date" name="date" required className={inputClass} />
              </Field>
              <Field label="Start" htmlFor="start">
                <input type="time" id="start" name="start" required className={inputClass} />
              </Field>
              <Field label="End" htmlFor="end">
                <input type="time" id="end" name="end" required className={inputClass} />
              </Field>
            </div>

            <Field label="Location (optional)" htmlFor="location">
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g. Participant's home — Newcastle"
                className={inputClass}
              />
            </Field>

            <button className="self-start rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700">
              Create shift (draft)
            </button>
          </form>
        )}
      </section>

      {/* ---- All shifts ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">All shifts</h2>
        {shifts.length === 0 ? (
          <p className="text-sm text-zinc-500">No shifts yet. Create one above.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                {/* Header: who + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-zinc-900">{s.participant.name}</span>
                    <span className="text-sm text-zinc-600">
                      {formatWhen(s.scheduledStart, s.scheduledEnd)}
                    </span>
                    {s.location && <span className="text-sm text-zinc-500">{s.location}</span>}
                    {s.allocatedTo && (
                      <span className="text-sm text-zinc-500">Worker: {s.allocatedTo.name}</span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUS_BADGE[s.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>

                {/* Latest audit-log line */}
                {s.events[0] && (
                  <p className="text-xs text-zinc-400">
                    Last: {humaniseEvent(s.events[0].type)}
                    {s.events[0].actor ? ` by ${s.events[0].actor.name}` : ""} ·{" "}
                    {s.events[0].createdAt.toLocaleString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {/* Actions for this status */}
                <ShiftActions shift={s} linkedWorkers={linkedWorkers[s.participantId] ?? []} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// The action controls shown under a shift, depending on its status.
function ShiftActions({
  shift,
  linkedWorkers,
}: {
  shift: ShiftRow;
  linkedWorkers: { id: string; name: string }[];
}) {
  const canAllocate = shift.status === "DRAFT" || shift.status === "OFFERED";
  const canOffer = shift.status === "DRAFT";
  const canCancel = shift.status !== "COMPLETED" && shift.status !== "CANCELLED";

  if (!canAllocate && !canOffer && !canCancel) {
    return null; // terminal/active shifts have no manager actions
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap sm:items-end">
      {/* Allocate to a linked worker */}
      {canAllocate &&
        (linkedWorkers.length > 0 ? (
          <form action={allocateShift} className="flex items-end gap-2">
            <input type="hidden" name="shiftId" value={shift.id} />
            <select
              name="workerId"
              aria-label="Worker to allocate to"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              {linkedWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Allocate
            </button>
          </form>
        ) : (
          <span className="text-xs text-zinc-400">No linked workers to allocate to.</span>
        ))}

      {/* Offer for auction */}
      {canOffer && (
        <form action={offerShift}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100">
            Offer (auction)
          </button>
        </form>
      )}

      {/* Cancel, with an optional reason */}
      {canCancel && (
        <form action={cancelShift} className="flex items-end gap-2 sm:ml-auto">
          <input type="hidden" name="shiftId" value={shift.id} />
          <input
            type="text"
            name="reason"
            placeholder="Reason (optional)"
            className="w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

// A single pending clock-time request, with the current vs proposed time and
// approve / reject buttons. Approving writes the proposed time onto the shift.
function AmendmentCard({ amendment: a }: { amendment: AmendmentRow }) {
  const isOn = a.field === "clockOnAt";
  const label = isOn ? "clock-on" : "clock-off";
  const current = isOn ? a.shift.clockOnAt : a.shift.clockOffAt;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-zinc-900">{a.shift.participant.name}</span>
        <span className="text-sm text-zinc-600">
          {a.requestedBy.name} · shift {formatDay(a.shift.scheduledStart)}
        </span>
        <span className="text-sm text-zinc-700">
          Set <span className="font-medium">{label}</span> to{" "}
          <span className="font-medium">{formatStamp(a.proposedValue)}</span>
          {current ? (
            <span className="text-zinc-500"> (currently {formatStamp(current)})</span>
          ) : (
            <span className="text-zinc-500"> (currently not set)</span>
          )}
        </span>
        {a.reason && <span className="text-sm text-zinc-500">“{a.reason}”</span>}
      </div>

      <div className="flex gap-2 border-t border-amber-100 pt-3">
        <form action={approveAmendment}>
          <input type="hidden" name="amendmentId" value={a.id} />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Approve
          </button>
        </form>
        <form action={rejectAmendment}>
          <input type="hidden" name="amendmentId" value={a.id} />
          <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
            Reject
          </button>
        </form>
      </div>
    </li>
  );
}

// --- Small helpers ---------------------------------------------------------

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function humaniseEvent(type: string): string {
  const map: Record<string, string> = {
    CREATED: "Created",
    OFFERED: "Offered",
    ALLOCATED: "Allocated",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    CLOCK_ON: "Clocked on",
    CLOCK_OFF: "Clocked off",
    CANCELLED: "Cancelled",
    AMEND_REQUESTED: "Time change requested",
    AMEND_APPROVED: "Time change approved",
    AMEND_REJECTED: "Time change rejected",
  };
  return map[type] ?? type;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function formatStamp(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWhen(start: Date, end: Date): string {
  const t = (d: Date) => d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  return `${formatDay(start)} · ${t(start)} – ${t(end)}`;
}
