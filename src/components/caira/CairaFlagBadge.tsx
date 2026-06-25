"use client";

import { useCallback, useEffect, useState } from "react";
import { useCaira } from "./CairaContext";

type Flag = {
  id: string;
  participantName: string;
  createdAt: string;
  flagReason?: string | null;
  triggerMessage: string;
};

/**
 * CairaFlagBadge — amber notification dot shown to workers/supervisors when there
 * are unreviewed participant safety flags. Polls every 60s. Tapping opens a small
 * panel to review + dismiss each flag. Rendered inside CairaBar over the antenna.
 */
export default function CairaFlagBadge() {
  const { persona } = useCaira();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/caira/flags", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setFlags(Array.isArray(data.flags) ? data.flags : []);
    } catch {
      // Network hiccup — keep the last known list.
    }
  }, []);

  // Only workers and supervisors poll for flags. Defer the first load off the effect
  // body so we never setState synchronously during render.
  useEffect(() => {
    if (persona === "participant") return;
    const first = setTimeout(load, 0);
    const id = setInterval(load, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [persona, load]);

  async function markReviewed(flagId: string) {
    setFlags((f) => f.filter((x) => x.id !== flagId)); // optimistic
    try {
      await fetch("/api/caira/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagId }),
      });
    } catch {
      load(); // re-sync on failure
    }
  }

  if (persona === "participant" || flags.length === 0) return null;

  return (
    <>
      {/* Amber dot over the antenna tip of the wandering head. */}
      <button
        type="button"
        aria-label={`${flags.length} unreviewed safety ${flags.length === 1 ? "flag" : "flags"}`}
        onClick={() => setOpen((o) => !o)}
        className="absolute -top-0.5 right-0 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow"
        style={{ animation: "recPulse 1.6s ease-in-out infinite" }}
      >
        {flags.length}
      </button>

      {open && (
        <div className="absolute right-2 top-[54px] z-50 w-80 max-w-[92vw] rounded-2xl border border-amber-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Safety flags
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {flags.map((f) => (
              <li key={f.id} className="rounded-xl bg-amber-50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800">{f.participantName}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(f.createdAt).toLocaleString("en-AU", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                {f.flagReason && (
                  <p className="mt-0.5 text-xs text-amber-700">{f.flagReason}</p>
                )}
                <button
                  type="button"
                  onClick={() => markReviewed(f.id)}
                  className="mt-1.5 text-xs font-semibold text-caira-teal-dk underline"
                >
                  Mark reviewed
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
