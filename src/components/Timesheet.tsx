// Timesheet.tsx — the worker's view of their own clock times.
//
// Lists shifts they've worked (in progress / completed) with the clock-on and
// clock-off time for each. Workers can't edit these directly, so every row
// offers a small form that *requests* a change — a missing time shows a loud
// "Add time" prompt; a present time shows a quiet "Request a change". Each
// request goes to a manager (see clock-actions.ts → ClockAmendmentRequest).
//
// Server component: the forms post straight to the server action, so this works
// with no client-side JavaScript. The expand/collapse uses the native <details>
// element (also no JS).

import { requestAmendment } from "@/lib/clock-actions";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";

type Amendment = {
  field: string; // "clockOnAt" | "clockOffAt"
  status: string; // PENDING | APPROVED | REJECTED
  proposedValue: Date;
};

type TimesheetShift = {
  id: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  clockOnAt: Date | null;
  clockOffAt: Date | null;
  participant: { name: string };
  amendments: Amendment[];
};

export function Timesheet({ shifts }: { shifts: TimesheetShift[] }) {
  if (shifts.length === 0) return null;

  const anyMissing = shifts.some((s) => !s.clockOnAt || !s.clockOffAt);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-900">Timesheet</h2>
      {anyMissing && (
        <p className="text-sm text-zinc-500">
          A shift below is missing a clock time. Add it and a manager will confirm it.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {shifts.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ParticipantAvatar name={s.participant.name} size="sm" />
                <span className="font-semibold text-zinc-900">{s.participant.name}</span>
              </div>
              <span className="text-sm text-zinc-500">{formatDay(s.scheduledStart)}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ClockRow shift={s} field="clockOnAt" />
              <ClockRow shift={s} field="clockOffAt" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// One clock time (on or off) for a shift: the value, plus the form to change it.
function ClockRow({ shift, field }: { shift: TimesheetShift; field: "clockOnAt" | "clockOffAt" }) {
  const label = field === "clockOnAt" ? "Clock on" : "Clock off";
  const value = field === "clockOnAt" ? shift.clockOnAt : shift.clockOffAt;
  const pending = shift.amendments.find((a) => a.field === field && a.status === "PENDING");
  const missing = !value;

  // A sensible default for the time picker: the existing time, or the scheduled
  // time if there isn't one yet.
  const fallback = field === "clockOnAt" ? shift.scheduledStart : shift.scheduledEnd;
  const defaultValue = toLocalInput(value ?? fallback);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        missing && !pending ? "border-amber-300 bg-amber-50/60" : "border-zinc-100 bg-zinc-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
        <span className={`text-sm font-medium ${missing ? "text-amber-700" : "text-zinc-800"}`}>
          {value ? formatTime(value) : "— missing"}
        </span>
      </div>

      {pending ? (
        // A request for this time is already waiting on a manager.
        <p className="text-xs text-blue-600">
          Awaiting approval · proposed {formatTime(pending.proposedValue)}
        </p>
      ) : (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium text-blue-600 hover:underline">
            {missing ? "Add time" : "Request a change"}
          </summary>
          <form action={requestAmendment} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="shiftId" value={shift.id} />
            <input type="hidden" name="field" value={field} />
            <input
              type="datetime-local"
              name="value"
              defaultValue={defaultValue}
              required
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
            <input
              type="text"
              name="reason"
              placeholder="Reason (optional)"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
            <button className="self-start rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Send to manager
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

// --- Date helpers ----------------------------------------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

// Format a Date as the value a <input type="datetime-local"> expects:
// "YYYY-MM-DDTHH:mm", in local time.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
