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
import { LOG_CATEGORIES, categoryRequiresNote, findCategory } from "@/lib/log-categories";
import { catColor } from "@/lib/category-colors";
import { addLogEntry } from "@/lib/log-actions";
import { DetailFields } from "@/components/DetailFields";
import { PhotoInput } from "@/components/PhotoInput";

export function ShiftTracker({
  shiftId,
  learnedOptions,
}: {
  shiftId: string;
  // Approved options for each self-learning group, keyed by the group key
  // (e.g. { drink: [...], activity: [...] }). From the DB; falls back to config.
  learnedOptions: Record<string, string[]>;
}) {
  // Which chip is currently open for a note (null = none open yet).
  const [selected, setSelected] = useState<string | null>(null);
  // Whether the worker is overriding the entry time (default = now).
  const [adjusting, setAdjusting] = useState(false);
  // Current value of each option group, so the note can react (e.g. PRN → required).
  const [groupValues, setGroupValues] = useState<Record<string, string[]>>({});
  // Photos attached to the entry being logged (data URLs).
  const [photos, setPhotos] = useState<string[]>([]);
  // The note text, kept in state so it can be backed up locally (Rule 8).
  const [note, setNote] = useState("");
  // Client-generated idempotency key for the entry being composed (Rule 12).
  const [entryKey, setEntryKey] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Where this shift+category's in-progress note is backed up (Rule 8).
  const noteBackupKey = (cat: string) => `dsw:note:${shiftId}:${cat}`;
  // The chosen category (for its renamed label + emoji in the compact header).
  const selectedCat = selected ? findCategory(selected) : null;

  // Whether the note is required: always (e.g. free-text Note) or conditionally
  // (e.g. medication PRN/Refused needs a reason).
  const rnw = selectedCat?.requireNoteWhen;
  const noteRequired =
    (selected ? categoryRequiresNote(selected) : false) ||
    (!!rnw && (groupValues[rnw.group] ?? []).some((v) => rnw.in.includes(v)));

  // Open a category fresh: clear any leftover time override + group picks. Mint a
  // new idempotency key for this entry, and restore any note we backed up earlier
  // (so a refresh or a dropped submit doesn't lose the worker's typing — Rule 8).
  function openCategory(key: string | null) {
    setSelected(key);
    setAdjusting(false);
    setGroupValues({});
    setPhotos([]);
    if (key) {
      setEntryKey(crypto.randomUUID());
      setNote(lsGet(noteBackupKey(key)));
    } else {
      setNote("");
    }
  }

  // Runs when the note form is submitted. We call the server action, then reset
  // the strip so it's clear and ready for the next entry. Passing an async
  // function to <form action> is allowed in a client component.
  async function handleSubmit(formData: FormData) {
    const cat = selected;
    await addLogEntry(formData);
    // Success only reaches here (a thrown action leaves the backup intact, Rule 8).
    if (cat) lsRemove(noteBackupKey(cat));
    setNote("");
    formRef.current?.reset();
    setSelected(null);
    setAdjusting(false);
    setGroupValues({});
    setPhotos([]);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Log something</h2>
        {/* Photo button (icon only) — enlarged and centred between the title and the
            "On shift" cue, while adding a log. */}
        {selected && (
          <div className="flex flex-1 justify-center">
            <PhotoInput photos={photos} onChange={setPhotos} iconOnly />
          </div>
        )}
        {/* A clear "you're live" cue while the shift is running. */}
        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          On shift
        </span>
      </div>

      {selected === null ? (
        // The full chip grid — fills the width so every target is big and easy to
        // tap on a phone (2 across on mobile, 4 on wider screens).
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {LOG_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => openCategory(c.key)}
              className={`${CHIP_BASE} ${catColor(c.key).chipIdle}`}
            >
              <span aria-hidden>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        // A category is chosen: hide the others, show a compact header with an
        // obvious Back button to reselect, then just this category's note box.
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="shiftId" value={shiftId} />
          <input type="hidden" name="category" value={selected} />
          <input type="hidden" name="idempotencyKey" value={entryKey} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCategory(null)}
              className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              <span aria-hidden>←</span> Back
            </button>
            <span
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${catColor(selected).chipActive}`}
            >
              <span aria-hidden>{selectedCat?.emoji}</span>
              {selectedCat?.label ?? selected}
            </span>
          </div>

          {/* Quick-pick detail chips / pickers for this category. */}
          <DetailFields
            key={selected}
            category={selected}
            learnedOptions={learnedOptions}
            values={groupValues}
            onGroupChange={(k, v) => setGroupValues((s) => ({ ...s, [k]: v }))}
          />

          <label className="text-sm font-medium text-zinc-700">
            Add a note{noteRequired ? " (required)" : " (optional)"}
          </label>
          <textarea
            name="notes"
            rows={2}
            // No autoFocus: tap into the box to type. This keeps the phone
            // keyboard from popping up the moment you open a category to log.
            // Controlled so each keystroke is backed up locally (Rule 8).
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (selected) lsSet(noteBackupKey(selected), e.target.value);
            }}
            // Required either always (e.g. free-text Note) or conditionally (e.g.
            // medication PRN/Refused). The browser blocks an empty submit and the
            // server re-checks the same rule.
            required={noteRequired}
            placeholder={
              categoryRequiresNote(selected)
                ? "Type your note…"
                : (selectedCat?.notePlaceholder ?? "e.g. add any detail worth noting")
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
          />

          {/* Photos are chosen via the 📷 button in the header above; they ride
              along in this hidden field. */}
          <input type="hidden" name="photos" value={JSON.stringify(photos)} />

          {/* When it happened. Default is the server's "now"; tap Adjust to set an
              earlier time (e.g. logging something from 20 min ago). Only when
              adjusting do we send a time — otherwise the server stamps now, keeping
              the server clock the source of truth. */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-zinc-700">Time</span>
            {adjusting ? (
              <>
                <input
                  type="time"
                  name="loggedTime"
                  defaultValue={nowHHMM()}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-base text-zinc-900 focus:border-blue-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAdjusting(false)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Use now
                </button>
              </>
            ) : (
              <>
                <span className="text-zinc-500">Now</span>
                <button
                  type="button"
                  onClick={() => setAdjusting(true)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Adjust
                </button>
              </>
            )}
          </div>

          <SubmitButton label={selectedCat?.label ?? selected} />
        </form>
      )}
    </section>
  );
}

// Current time as "HH:MM" (24h), used as the starting value when the worker taps
// "Adjust". They can change it from there; an unchanged "Now" sends no time at all.
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// The save button. It lives inside the form so useFormStatus() can tell us when
// the entry is mid-save — we disable it then so a double-tap can't log twice.
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : `Log ${label}`}
    </button>
  );
}

// Small localStorage helpers for the Rule 8 note backup. Guarded so private mode
// (or any storage error) never breaks logging.
function lsGet(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore storage failures */
  }
}
function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore storage failures */
  }
}

// Tailwind needs the full class strings written out, so the per-category colours
// live in `category-colors.ts` (shared with the timeline) and we glue on the base.
const CHIP_BASE =
  "flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-base font-medium transition-colors";
