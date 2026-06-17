// ShiftTracker.tsx — the quick-capture chips at the top of a running shift.
//
// Why this one is a *client* component ("use client"): it remembers which chip
// you tapped (a tiny bit of in-browser state) and shows a note box for it. The
// page around it stays a server component; only this interactive strip runs in
// the browser — same split as the calendar.
//
// Flow: tap a chip → a note box opens (note is optional) → "Log it" saves via the
// server action → the timeline below refreshes and the box closes ready for the
// next one. Built for one-handed use on a phone during a shift.

"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LOG_CATEGORIES } from "@/lib/log-categories";
import { addLogEntry } from "@/lib/log-actions";

export function ShiftTracker({ shiftId }: { shiftId: string }) {
  // Which chip is currently open for a note (null = none open yet).
  const [selected, setSelected] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Runs when the note form is submitted. We call the server action, then reset
  // the strip so it's clear and ready for the next entry. Passing an async
  // function to <form action> is allowed in a client component.
  async function handleSubmit(formData: FormData) {
    await addLogEntry(formData);
    formRef.current?.reset();
    setSelected(null);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Log something</h2>

      {/* The chip grid. Tapping a chip selects it (or closes it if tapped again). */}
      <div className="flex flex-wrap gap-2">
        {LOG_CATEGORIES.map((c) => {
          const active = selected === c.key;
          const incident = c.key === "Incident";
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelected(active ? null : c.key)}
              className={chipClasses(active, incident)}
            >
              <span aria-hidden>{c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* The note box for the chosen chip. Only shown once a chip is selected. */}
      {selected && (
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
          <input type="hidden" name="shiftId" value={shiftId} />
          <input type="hidden" name="category" value={selected} />
          <label className="text-sm font-medium text-zinc-700">
            {selected} — add a note (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            autoFocus
            placeholder="e.g. ate most of lunch, good appetite"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <SubmitButton category={selected} />
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// The save button. It lives inside the form so useFormStatus() can tell us when
// the entry is mid-save — we disable it then so a double-tap can't log twice.
function SubmitButton({ category }: { category: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : `Log ${category}`}
    </button>
  );
}

// Tailwind needs the full class strings written out (it can't see ones we build
// by gluing pieces together), so we pick from complete strings here.
function chipClasses(active: boolean, incident: boolean): string {
  const base =
    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";
  if (incident) {
    return active
      ? `${base} border-amber-400 bg-amber-100 text-amber-800`
      : `${base} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
  }
  return active
    ? `${base} border-blue-400 bg-blue-100 text-blue-800`
    : `${base} border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100`;
}
