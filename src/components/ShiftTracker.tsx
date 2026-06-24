// ShiftTracker.tsx — Caira in-shift capture (rebuilt to match the design source of
// truth: docs/design/Caira Tracker.dc.html + screenshots). One client island with
// three views via a segmented control:
//   • Mic      → voice mode: a (stubbed) record button + a free-text box that saves
//                as a Note (real audio is out of scope).
//   • Capture  → the 3-across Paper-icon tile grid; tapping a tile opens that
//                category's detail panel (quick-options + note) → saves an entry.
//   • Timeline → the shift's history (passed in, rendered as-is).
// Plus a "Report an incident" button. Everything saves through the existing
// addLogEntry server action against live Supabase. Built for one-handed phone use
// (thumb-zone, >=44px targets).

"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { categoryRequiresNote, findCategory } from "@/lib/log-categories";
import { addLogEntry } from "@/lib/log-actions";
import { DetailFields } from "@/components/DetailFields";
import { PhotoInput } from "@/components/PhotoInput";
import { PaperIcon, PaperDefs } from "@/components/PaperIcon";

// The six categories shown as Paper tiles, in design order. Note is reached via the
// voice/type free-text; Incident via its own button below the grid.
const TILE_KEYS = ["Meal", "Fluids", "Hygiene", "Activity", "Toileting", "Meds"];

type View = "capture" | "timeline" | "voice";

export function ShiftTracker({
  shiftId,
  learnedOptions,
  timeline,
}: {
  shiftId: string;
  // Approved options for each self-learning group (e.g. { drink: [...] }).
  learnedOptions: Record<string, string[]>;
  // The shift history, rendered into the Timeline tab.
  timeline?: ReactNode;
}) {
  const [view, setView] = useState<View>("capture");
  // Which category's detail panel is open (null = the tile grid).
  const [selected, setSelected] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [groupValues, setGroupValues] = useState<Record<string, string[]>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [entryKey, setEntryKey] = useState("");
  // Voice mode: a visual recording toggle (no real audio) + a typed note.
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const noteBackupKey = (cat: string) => `dsw:note:${shiftId}:${cat}`;
  const voiceBackupKey = `dsw:voicenote:${shiftId}`;
  const selectedCat = selected ? findCategory(selected) : null;

  const rnw = selectedCat?.requireNoteWhen;
  const noteRequired =
    (selected ? categoryRequiresNote(selected) : false) ||
    (!!rnw && (groupValues[rnw.group] ?? []).some((v) => rnw.in.includes(v)));

  // Open a category's detail panel fresh (Rule 8 restore + Rule 12 idempotency key).
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

  function gotoView(next: View) {
    setView(next);
    setSelected(null);
    if (next === "voice") {
      setEntryKey(crypto.randomUUID());
      setVoiceNote(lsGet(voiceBackupKey));
      setRecording(false);
    }
  }

  // Save a category entry (detail panel), then reset back to the grid.
  async function handleSubmit(formData: FormData) {
    const cat = selected;
    await addLogEntry(formData);
    if (cat) lsRemove(noteBackupKey(cat));
    setNote("");
    formRef.current?.reset();
    setSelected(null);
    setAdjusting(false);
    setGroupValues({});
    setPhotos([]);
  }

  // Save the voice/typed free-text as a Note entry, then return to capture.
  async function handleVoiceSubmit(formData: FormData) {
    await addLogEntry(formData);
    lsRemove(voiceBackupKey);
    setVoiceNote("");
    setRecording(false);
    setView("capture");
  }

  return (
    <section className="flex flex-1 flex-col gap-3">
      <PaperDefs />

      {/* Segmented control: Mic · Capture · Timeline */}
      <div className="grid grid-cols-[56px_1fr_1fr] gap-1 rounded-2xl bg-[#efe6d6] p-1">
        <button
          type="button"
          onClick={() => gotoView("voice")}
          aria-label="Voice note"
          aria-pressed={view === "voice"}
          className={`flex h-[44px] items-center justify-center rounded-xl transition-colors ${
            view === "voice" ? "bg-brand text-white shadow-sm" : "text-[#9b8a72]"
          }`}
        >
          <MicIcon />
        </button>
        <button
          type="button"
          onClick={() => gotoView("capture")}
          aria-pressed={view === "capture"}
          className={`h-[44px] rounded-xl text-sm font-bold transition-colors ${
            view === "capture" ? "bg-brand text-white shadow-sm" : "text-muted"
          }`}
        >
          Capture
        </button>
        <button
          type="button"
          onClick={() => gotoView("timeline")}
          aria-pressed={view === "timeline"}
          className={`h-[44px] rounded-xl text-sm font-bold transition-colors ${
            view === "timeline" ? "bg-brand text-white shadow-sm" : "text-muted"
          }`}
        >
          Timeline
        </button>
      </div>

      {/* CAPTURE */}
      {view === "capture" &&
        (selected === null ? (
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-center text-[11px] font-semibold text-muted">
              Tap a category to log — or tap the mic for a voice note
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {TILE_KEYS.map((key) => {
                const c = findCategory(key);
                if (!c) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openCategory(key)}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-border bg-surface transition-colors hover:bg-surface-sunk"
                  >
                    <PaperIcon category={key} size={46} />
                    <span className="text-xs font-semibold text-foreground">{c.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Report an incident — opens the Incident note panel (calm, not alarmist). */}
            <button
              type="button"
              onClick={() => openCategory("Incident")}
              className="mt-auto flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#ecd9d2] bg-[#f9f1ef]"
            >
              <span className="h-2 w-2 rounded-full bg-[#d2a596]" aria-hidden />
              <span className="text-xs font-extrabold tracking-wide text-[#ad9087]">
                REPORT AN INCIDENT
              </span>
            </button>
          </div>
        ) : (
          // Detail panel for the chosen category.
          <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
            <input type="hidden" name="shiftId" value={shiftId} />
            <input type="hidden" name="category" value={selected} />
            <input type="hidden" name="idempotencyKey" value={entryKey} />

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              {hasTile(selected) ? (
                <PaperIcon category={selected} size={40} />
              ) : (
                <span className="text-2xl" aria-hidden>
                  {selectedCat?.emoji}
                </span>
              )}
              <span className="font-display text-lg font-bold text-foreground">
                {selectedCat?.label ?? selected}
              </span>
              <button
                type="button"
                onClick={() => openCategory(null)}
                className="ml-auto flex min-h-[44px] items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk"
              >
                <span aria-hidden>←</span> Back
              </button>
            </div>

            <DetailFields
              key={selected}
              category={selected}
              learnedOptions={learnedOptions}
              values={groupValues}
              onGroupChange={(k, v) => setGroupValues((s) => ({ ...s, [k]: v }))}
            />

            <label className="text-sm font-medium text-foreground">
              Add a note{noteRequired ? " (required)" : " (optional)"}
            </label>
            <textarea
              name="notes"
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (selected) lsSet(noteBackupKey(selected), e.target.value);
              }}
              required={noteRequired}
              placeholder={
                categoryRequiresNote(selected)
                  ? "Type your note…"
                  : (selectedCat?.notePlaceholder ?? "e.g. add any detail worth noting")
              }
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />

            <input type="hidden" name="photos" value={JSON.stringify(photos)} />

            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Time</span>
                {adjusting ? (
                  <>
                    <input
                      type="time"
                      name="loggedTime"
                      defaultValue={nowHHMM()}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-base text-foreground focus:border-brand focus:outline-none"
                    />
                    <button type="button" onClick={() => setAdjusting(false)} className="font-medium text-brand">
                      Use now
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-muted">Now</span>
                    <button type="button" onClick={() => setAdjusting(true)} className="font-medium text-brand">
                      Adjust
                    </button>
                  </>
                )}
              </div>
              <PhotoInput photos={photos} onChange={setPhotos} iconOnly />
            </div>

            <SubmitButton label={selectedCat?.label ?? selected} />
          </form>
        ))}

      {/* VOICE — record (stub) + free-text that saves as a Note */}
      {view === "voice" && (
        <div className="flex flex-1 flex-col items-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => setRecording((r) => !r)}
            aria-pressed={recording}
            className="flex h-24 w-24 items-center justify-center rounded-full text-white transition-shadow"
            style={{
              background: recording ? "#b23a28" : "var(--clay)",
              boxShadow: recording
                ? "0 0 0 10px rgba(223,91,64,.16)"
                : "0 12px 24px rgba(223,91,64,.40)",
            }}
          >
            <MicIcon size={34} />
          </button>
          <div className="text-center">
            <div className="font-display text-base font-bold text-foreground">
              {recording ? "Recording…" : "Tap to record"}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-muted">
              Voice transcription is coming soon — type your note below.
            </div>
          </div>

          <form action={handleVoiceSubmit} className="flex w-full flex-col gap-3">
            <input type="hidden" name="shiftId" value={shiftId} />
            <input type="hidden" name="category" value="Note" />
            <input type="hidden" name="idempotencyKey" value={entryKey} />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Note</div>
            <textarea
              name="notes"
              required
              value={voiceNote}
              onChange={(e) => {
                setVoiceNote(e.target.value);
                lsSet(voiceBackupKey, e.target.value);
              }}
              placeholder="Transcript appears here — or type a note…"
              className="h-28 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => gotoView("capture")}
                className="h-12 w-28 rounded-[14px] border border-[#e3d6c1] bg-surface text-sm font-bold text-muted"
              >
                Cancel
              </button>
              <SubmitButton label="voice note" full />
            </div>
          </form>
        </div>
      )}

      {/* TIMELINE */}
      {view === "timeline" && (
        <div className="flex-1">
          {timeline ?? <p className="py-8 text-center text-sm text-muted">No entries yet.</p>}
        </div>
      )}
    </section>
  );
}

function hasTile(key: string): boolean {
  return TILE_KEYS.includes(key);
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Save button: disabled while the action is mid-flight so a double-tap can't log twice.
function SubmitButton({ label, full }: { label: string; full?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${full ? "flex-1" : "w-full"} h-12 rounded-[14px] bg-brand px-5 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60`}
    >
      {pending ? "Saving…" : `Save ${label}`}
    </button>
  );
}

function MicIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

// localStorage helpers for the Rule 8 note backup. Guarded so private mode never
// breaks logging.
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
    /* ignore */
  }
}
function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
