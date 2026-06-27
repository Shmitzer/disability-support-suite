// ShiftTimeline.tsx — the running story of a shift, most recent at the top.
//
// It reads as a real timeline: a vertical rail with a coloured dot per item, with
// the shift's milestones (clocked on/off) on the same rail. Entries are grouped by
// time of day, and a chip bar lets you filter to one category.
//
// Client component: it holds the active filter. Each entry row is `TimelineEntry`
// (which can flip into an inline edit form).

"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { TimelineEntry } from "@/components/TimelineEntry";
import { LOG_CATEGORIES } from "@/lib/log-categories";

type Entry = {
  id: string;
  category: string;
  detail: string | null;
  notes: string;
  photos: string | null;
  timestamp: Date;
  derivedFromId?: string | null; // provenance: extracted from a note → "from note" badge
};

type Item =
  | { kind: "milestone"; at: Date; label: string }
  | { kind: "entry"; at: Date; entry: Entry };

export function ShiftTimeline({
  clockOnAt,
  clockOffAt,
  entries,
  editable,
  logText,
  learnedOptions,
}: {
  clockOnAt: Date | null;
  clockOffAt: Date | null;
  entries: Entry[];
  editable: boolean; // entries can be edited/removed only while the shift is running
  logText?: string; // the whole shift as plain text, for the "Copy log" button
  learnedOptions: Record<string, string[]>; // for the inline edit pickers
}) {
  // Active category filter (null = show everything).
  const [filter, setFilter] = useState<string | null>(null);

  // Which categories actually appear (so we only offer useful filter chips), in the
  // app's category order.
  const present = LOG_CATEGORIES.filter((c) => entries.some((e) => e.category === c.key));

  // Build the list to show. When filtering, show just those entries (no milestones).
  const shown = filter ? entries.filter((e) => e.category === filter) : entries;
  const items: Item[] = [];
  if (!filter && clockOnAt) items.push({ kind: "milestone", at: clockOnAt, label: "Clocked on" });
  for (const e of shown) items.push({ kind: "entry", at: e.timestamp, entry: e });
  if (!filter && clockOffAt) items.push({ kind: "milestone", at: clockOffAt, label: "Clocked off" });
  // Most recent first — newest entries sit at the top.
  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  // Insert a time-of-day header whenever the period changes.
  const rows: ({ type: "header"; label: string; key: string } | { type: "item"; item: Item })[] = [];
  let prevPeriod = "";
  for (const item of items) {
    const period = periodOf(item.at);
    if (period !== prevPeriod) {
      rows.push({ type: "header", label: period, key: `h-${period}-${item.at.getTime()}` });
      prevPeriod = period;
    }
    rows.push({ type: "item", item });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          Timeline
          {entries.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {entries.length}
            </span>
          )}
        </h2>
        {logText && <CopyButton text={logText} label="Copy log" />}
      </div>

      {/* Filter chips — only worth showing once there's more than one category. */}
      {present.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            All
          </FilterChip>
          {present.map((c) => (
            <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
              <span aria-hidden>{c.emoji}</span> {c.label}
            </FilterChip>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {filter ? "Nothing logged in this category." : "Nothing logged yet. Tap a chip above to start."}
        </p>
      ) : (
        <div className="relative">
          {/* The rail — a faint vertical line behind the dots. */}
          <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-zinc-200" aria-hidden />
          <ol className="flex flex-col gap-3">
            {rows.map((row) =>
              row.type === "header" ? (
                <li
                  key={row.key}
                  className="ml-11 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {row.label}
                </li>
              ) : row.item.kind === "milestone" ? (
                <li key={`m-${row.item.label}`} className="relative flex items-center gap-3">
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-white">
                    <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-zinc-500">{row.item.label}</span>
                  <span className="ml-auto text-sm tabular-nums text-zinc-500">
                    {formatTime(row.item.at)}
                  </span>
                </li>
              ) : (
                <TimelineEntry
                  key={row.item.entry.id}
                  entry={row.item.entry}
                  editable={editable}
                  learnedOptions={learnedOptions}
                />
              ),
            )}
          </ol>
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-blue-400 bg-blue-100 text-blue-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

// Time-of-day bucket for the section headers.
function periodOf(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Night";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}
