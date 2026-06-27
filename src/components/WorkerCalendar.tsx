"use client";

// WorkerCalendar.tsx — a simple month calendar for the worker homepage.
// Shows one month at a time with a coloured dot for each shift. Tap a day to
// see that day's shifts listed underneath. Runs in the browser so the month
// arrows and day selection work without reloading the page.

import { useMemo, useState } from "react";
import type { CalendarShift } from "@/lib/shifts";

// How each shift status looks on the calendar (Option A: soft, clinical).
const STATUS_STYLE: Record<
  string,
  { dot: string; label: string; text: string }
> = {
  COMPLETED: { dot: "bg-emerald-500", label: "Completed", text: "text-emerald-700" },
  IN_PROGRESS: { dot: "bg-blue-500", label: "In progress", text: "text-blue-700" },
  ALLOCATED: { dot: "bg-blue-400", label: "Allocated", text: "text-blue-700" },
  OFFERED: { dot: "bg-amber-400", label: "Available", text: "text-amber-700" },
  CANCELLED: { dot: "bg-rose-300", label: "Cancelled", text: "text-rose-600" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A local YYYY-MM-DD key for grouping shifts by day (avoids timezone surprises).
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkerCalendar({ shifts }: { shifts: CalendarShift[] }) {
  const today = new Date();
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState<string>(dayKey(today));

  // Group shifts by the day they start on, once.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarShift[]>();
    for (const s of shifts) {
      const key = dayKey(new Date(s.start));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  // Build the grid of days for the visible month, padded to whole weeks
  // (starting Monday).
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    // JS weekday: 0=Sun..6=Sat. We want Monday-first, so shift it.
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

    const out: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(view.year, view.month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  const todayKey = dayKey(today);
  const selectedShifts = byDay.get(selectedKey) ?? [];
  const selectedLabel = parseKeyLabel(selectedKey);

  function step(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return {
        year: v.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      };
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Month header with arrows */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-zinc-200 px-3 py-1 text-zinc-600 hover:bg-zinc-50"
          >
            ‹
          </button>
          <button
            onClick={() => step(1)}
            aria-label="Next month"
            className="rounded-lg border border-zinc-200 px-3 py-1 text-zinc-600 hover:bg-zinc-50"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const key = dayKey(date);
          const dayShifts = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={[
                "flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                isSelected
                  ? "border-blue-400 bg-blue-50"
                  : "border-transparent hover:bg-zinc-50",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  isToday ? "bg-blue-600 font-semibold text-white" : "text-zinc-700",
                ].join(" ")}
              >
                {date.getDate()}
              </span>
              <div className="flex flex-wrap justify-center gap-0.5">
                {dayShifts.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_STYLE[s.status]?.dot ?? "bg-zinc-300",
                    ].join(" ")}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        {Object.entries(STATUS_STYLE).map(([status, style]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        ))}
      </div>

      {/* Selected day's shifts */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-700">{selectedLabel}</h3>
        {selectedShifts.length === 0 ? (
          <p className="text-sm text-zinc-400">No shifts this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedShifts
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => {
                const style = STATUS_STYLE[s.status];
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800">
                        {s.participantName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatTime(s.start)} – {formatTime(s.end)}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${style?.text ?? "text-zinc-500"}`}>
                      {style?.label ?? s.status}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}

// Turn a "2026-5-17" day key into "Wednesday, 17 June".
function parseKeyLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m, d).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
