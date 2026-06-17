// ShiftTimeline.tsx — the running story of a shift, oldest at the top.
//
// It's "pre-filled from the shift": the shift's own milestones (clocked on, and
// clocked off once finished) sit on the same timeline as the log entries the
// worker captured, so it reads start-to-finish like a diary of the shift.
//
// Server component: the per-entry "remove" control is a plain form posting to a
// server action, so no client-side JavaScript is needed here.

import { deleteLogEntry } from "@/lib/log-actions";
import { findCategory } from "@/lib/log-categories";

type Entry = {
  id: string;
  category: string;
  notes: string;
  timestamp: Date;
};

// One row on the timeline, after we merge milestones + entries into a single list.
type Item =
  | { kind: "milestone"; at: Date; label: string }
  | { kind: "entry"; at: Date; entry: Entry };

export function ShiftTimeline({
  clockOnAt,
  clockOffAt,
  entries,
  editable,
}: {
  clockOnAt: Date | null;
  clockOffAt: Date | null;
  entries: Entry[];
  editable: boolean; // entries can be removed only while the shift is running
}) {
  // Merge the shift's milestones with the log entries, then sort by time so the
  // whole thing reads in order.
  const items: Item[] = [];
  if (clockOnAt) items.push({ kind: "milestone", at: clockOnAt, label: "Clocked on" });
  for (const e of entries) items.push({ kind: "entry", at: e.timestamp, entry: e });
  if (clockOffAt) items.push({ kind: "milestone", at: clockOffAt, label: "Clocked off" });
  items.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-900">
        Timeline
        {entries.length > 0 && (
          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {entries.length}
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">Nothing logged yet. Tap a chip above to start.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item) =>
            item.kind === "milestone" ? (
              <li
                key={`m-${item.label}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5"
              >
                <span className="text-sm font-medium text-zinc-500">{item.label}</span>
                <span className="ml-auto text-sm tabular-nums text-zinc-500">{formatTime(item.at)}</span>
              </li>
            ) : (
              <li
                key={item.entry.id}
                className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-lg leading-none" aria-hidden>
                  {findCategory(item.entry.category)?.emoji ?? "•"}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-zinc-900">{item.entry.category}</span>
                  {item.entry.notes && (
                    <span className="text-sm text-zinc-600">{item.entry.notes}</span>
                  )}
                </div>
                <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm tabular-nums text-zinc-500">{formatTime(item.at)}</span>
                  {editable && (
                    <form action={deleteLogEntry}>
                      <input type="hidden" name="entryId" value={item.entry.id} />
                      <button className="text-xs text-zinc-400 hover:text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
