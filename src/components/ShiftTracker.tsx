// ShiftTracker.tsx — Caira in-shift capture (rebuilt to match the design source of
// truth: docs/design/Caira Tracker.dc.html + screenshots). One client island with
// three views via a segmented control:
//   • Mic      → voice mode: record audio (MediaRecorder) → transcribe via
//                /api/transcribe → editable note box that saves as a Note. The
//                worker reviews the transcript before saving (Rule 11).
//   • Capture  → the 3-across Paper-icon tile grid; tapping a tile opens that
//                category's detail panel (quick-options + note) → saves an entry.
//   • Timeline → the shift's history (passed in, rendered as-is).
// Plus a "Report an incident" button. Everything saves through the existing
// addLogEntry server action against live Supabase. Built for one-handed phone use
// (thumb-zone, >=44px targets).

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { categoryRequiresNote, findCategory, LOG_CATEGORIES } from "@/lib/log-categories";
import {
  addLogEntry,
  extractNotePreview,
  commitExtractedEntries,
  getEntryQuestions,
  getDraftQuestions,
  type NoteEntryDraft,
} from "@/lib/log-actions";
import { timeWindowWarning, minutesOfDay } from "@/lib/shift-time";
import { DetailFields } from "@/components/DetailFields";
import { PhotoInput } from "@/components/PhotoInput";
import { PaperIcon, PaperDefs } from "@/components/PaperIcon";
import {
  blobToWavBase64,
  canRecordAudio,
  pickRecordingMimeType,
  getSpeechRecognition,
  supportsLiveSpeech,
  type SpeechRecognitionLike,
} from "@/lib/audio";

// The categories shown as Paper tiles, in design order. Note is reached via the
// voice/type free-text; Incident via its own button below the grid.
// Curated tile order. Need-gated tiles (Behaviour/Seizure/Repositioning) only render
// when the participant's profile enables them (TILE_KEYS ∩ visibleKeys).
const TILE_KEYS = [
  "Meal",
  "Fluids",
  "Hygiene",
  "Activity",
  "Sleep",
  "Toileting",
  "Meds",
  "Behaviour",
  "Seizure",
  "Repositioning",
];

type View = "capture" | "timeline" | "voice";

export function ShiftTracker({
  shiftId,
  learnedOptions,
  timeline,
  visibleKeys,
  supportNeeds,
  shiftStartISO,
}: {
  shiftId: string;
  // Approved options for each self-learning group (e.g. { drink: [...] }).
  learnedOptions: Record<string, string[]>;
  // The shift history, rendered into the Timeline tab.
  timeline?: ReactNode;
  // Category keys this participant's care profile enables. Omitted = show all
  // (legacy / unconfigured). The tile grid is TILE_KEYS ∩ visibleKeys.
  visibleKeys?: string[];
  // The participant's support-need flags, for filtering need-gated sub-groups.
  supportNeeds?: string[] | null;
  // When the shift was clocked on (ISO) — the start of the valid time window for
  // entries. The end is "now" (logging only happens while the shift is in progress).
  shiftStartISO?: string | null;
}) {
  // The shift window as "HH:MM" bounds for warning on out-of-window entry times.
  const shiftStartHHMM = shiftStartISO ? hhmmLocal(new Date(shiftStartISO)) : null;
  // Tiles to show: the curated tile order, narrowed to what the profile enables.
  const tiles = visibleKeys ? TILE_KEYS.filter((k) => visibleKeys.includes(k)) : TILE_KEYS;
  const [view, setView] = useState<View>("capture");
  // Which category's detail panel is open (null = the tile grid).
  const [selected, setSelected] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  // The time the worker set for the entry being captured (controlled, so we can warn
  // live if it falls outside the shift window). Empty until they tap "Set a time".
  const [chipTime, setChipTime] = useState("");
  const chipTimeWarning = adjusting ? timeWindowWarning(chipTime, shiftStartHHMM, nowHHMM()) : null;
  const [groupValues, setGroupValues] = useState<Record<string, string[]>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  // AI entry-level clarifying prompts (e.g. "Did Sam buy anything?") for the chip being
  // logged. Fetched on demand; tapping one drops it into the note to answer.
  const [entryQuestions, setEntryQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  // The entryKey we've already auto-suggested for, so the auto-fetch fires at most once
  // per entry (and never fights the worker who tapped the button or is mid-typing).
  const autoSuggestedRef = useRef<string | null>(null);
  const [entryKey, setEntryKey] = useState("");
  // Voice mode: record → transcribe → editable note. `vstatus` drives the mic UI;
  // the MediaRecorder + its captured chunks live in refs (not state — they mustn't
  // trigger re-renders mid-recording).
  const [vstatus, setVstatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const [vError, setVError] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Live (Web Speech) transcription: the recognition instance, the text that was
  // already in the box when recording started (baseRef), and the finalised
  // (non-interim) words so far (finalRef).
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const finalRef = useRef("");
  // Note → entries: drafts is the review list (null = not in review); the flags drive
  // the "analysing" / "creating" button states.
  const [drafts, setDrafts] = useState<NoteEntryDraft[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [committing, setCommitting] = useState(false);
  // Per-draft AI prompts in the voice review (index → questions / loading), plus a ref
  // so the auto-suggest pass runs once per extracted set.
  const [draftQuestions, setDraftQuestions] = useState<Record<number, string[]>>({});
  const [draftQLoading, setDraftQLoading] = useState<Record<number, boolean>>({});
  const draftsAutoRef = useRef<NoteEntryDraft[] | null>(null);
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
    setChipTime("");
    setGroupValues({});
    setPhotos([]);
    setEntryQuestions([]);
    setLoadingQuestions(false);
    if (key) {
      setEntryKey(crypto.randomUUID());
      setNote(lsGet(noteBackupKey(key)));
    } else {
      setNote("");
    }
  }

  // Ask the AI for a few human, entry-specific prompts for the chip being logged.
  async function handleSuggestQuestions() {
    if (!selected || loadingQuestions) return;
    setLoadingQuestions(true);
    try {
      const res = await getEntryQuestions(shiftId, selected, groupValues, note);
      setEntryQuestions(res.questions);
    } catch {
      setEntryQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  // Drop a suggested question into the note for the worker to answer, then remove it
  // from the list. Appends on its own line so several can be stacked.
  function insertQuestion(q: string) {
    setNote((prev) => {
      const next = prev.trim() ? `${prev.trimEnd()}\n${q} ` : `${q} `;
      if (selected) lsSet(noteBackupKey(selected), next);
      return next;
    });
    setEntryQuestions((qs) => qs.filter((x) => x !== q));
  }

  // Auto-suggest once per entry: when the worker has picked some detail but hasn't
  // written much yet, fetch prompts unprompted (they can still tap the button to
  // re-fetch). Guarded by entryKey so it fires at most once and never mid-typing.
  const hasPicks = Object.values(groupValues).some((v) => v.length > 0);
  useEffect(() => {
    if (view !== "capture" || !selected) return;
    if (autoSuggestedRef.current === entryKey) return;
    if (!hasPicks || note.trim().length >= 12) return;
    autoSuggestedRef.current = entryKey;
    // Defer out of the effect body (the fetch sets state on resolve).
    const t = setTimeout(() => void handleSuggestQuestions(), 0);
    return () => clearTimeout(t);
    // Intentionally keyed on the entry + picks only — not `note` (we read it at fire
    // time) and not the handler (stable enough; the ref guard prevents re-firing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, entryKey, hasPicks, view]);

  function gotoView(next: View) {
    // Leaving the mic tab mid-dictation: abort live recognition so it doesn't keep
    // listening in the background. (abort() won't fire a final result.)
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setView(next);
    setSelected(null);
    setDrafts(null);
    if (next === "voice") {
      setEntryKey(crypto.randomUUID());
      setVoiceNote(lsGet(voiceBackupKey));
      setVstatus("idle");
      setVError("");
    } else if (vstatus !== "transcribing") {
      setVstatus("idle");
    }
  }

  // Note → entries: analyse the note into draft entries (read-only) for review.
  async function handleExtract() {
    setVError("");
    setExtracting(true);
    try {
      const res = await extractNotePreview(shiftId, voiceNote);
      if (res.error) setVError(res.error);
      else if (res.items.length === 0)
        setVError("No loggable activities found — save it as a single note instead.");
      else setDrafts(res.items);
    } finally {
      setExtracting(false);
    }
  }

  function updateDraft(index: number, patch: Partial<NoteEntryDraft>) {
    setDrafts((d) => d?.map((item, i) => (i === index ? { ...item, ...patch } : item)) ?? null);
  }

  function removeDraft(index: number) {
    setDrafts((d) => {
      const next = (d ?? []).filter((_, i) => i !== index);
      return next.length ? next : null; // leaving none closes the review
    });
  }

  // Fetch AI prompts for one extracted draft (tap-to-trigger; also used by auto-suggest).
  async function suggestForDraft(index: number) {
    const d = drafts?.[index];
    if (!d || draftQLoading[index]) return;
    setDraftQLoading((s) => ({ ...s, [index]: true }));
    try {
      const res = await getDraftQuestions(shiftId, d.category, d.detail, d.notes);
      setDraftQuestions((s) => ({ ...s, [index]: res.questions }));
    } catch {
      setDraftQuestions((s) => ({ ...s, [index]: [] }));
    } finally {
      setDraftQLoading((s) => ({ ...s, [index]: false }));
    }
  }

  // Drop a draft's suggested question into that draft's note, then remove it from the list.
  function insertDraftQuestion(index: number, q: string) {
    const cur = drafts?.[index]?.notes ?? "";
    updateDraft(index, { notes: cur.trim() ? `${cur.trimEnd()}\n${q} ` : `${q} ` });
    setDraftQuestions((s) => ({ ...s, [index]: (s[index] ?? []).filter((x) => x !== q) }));
  }

  // Auto-suggest once per extracted set: for drafts that came back with an empty note,
  // fetch prompts so the worker sees them without tapping. Runs a single pass.
  useEffect(() => {
    if (!drafts || draftsAutoRef.current === drafts) return;
    const set = drafts;
    draftsAutoRef.current = set;
    // Defer out of the effect body (these set state directly + on resolve).
    const t = setTimeout(() => {
      setDraftQuestions({});
      setDraftQLoading({});
      set.forEach((d, i) => {
        if (!d.notes.trim()) void suggestForDraft(i);
      });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  // Confirm: create the entries + keep the original note as their parent.
  async function handleConfirmExtraction() {
    if (!drafts) return;
    setCommitting(true);
    try {
      const res = await commitExtractedEntries(shiftId, voiceNote, drafts);
      if (res.error) {
        setVError(res.error);
        return;
      }
      lsRemove(voiceBackupKey);
      setVoiceNote("");
      setDrafts(null);
      setVError("");
      setView("timeline"); // show the freshly-created entries
    } finally {
      setCommitting(false);
    }
  }

  // Tap to start; tap again to stop. Uses live Web Speech transcription when the
  // browser supports it (text streams into the box as you speak), otherwise falls
  // back to the record → /api/transcribe batch path.
  async function toggleRecording() {
    if (vstatus === "recording") {
      stopRecording();
      return;
    }
    if (vstatus === "transcribing") return;

    setVError("");
    if (supportsLiveSpeech()) {
      startLiveRecognition();
    } else {
      await startBatchRecording();
    }
  }

  // Stop whichever capture is active.
  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // → onend finalises
    } else {
      recorderRef.current?.stop(); // → onstop transcribes
    }
  }

  // LIVE: Web Speech API streams interim words straight into the note box. The box
  // is read-only while recording so a stream update can't clobber a manual edit.
  function startLiveRecognition() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      void startBatchRecording();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-AU";
    recognition.continuous = true;
    recognition.interimResults = true;

    // Append to whatever is already in the box (a previous dictation or typing).
    baseRef.current = voiceNote ? `${voiceNote.trimEnd()} ` : "";
    finalRef.current = "";

    recognition.onresult = (event) => {
      // Rebuild from the WHOLE results list every event — never append. With
      // continuous=true, Chrome re-reports already-final results across events, so
      // incremental appending duplicates them ("testing testing testing…"). The
      // results list is authoritative; recomputing each time is dedupe-by-design.
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }
      finalRef.current = finalText;
      setVoiceNote(joinTranscript(baseRef.current, finalText + interim));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVError("Microphone blocked. Allow mic access, or type your note below.");
      } else if (event.error === "no-speech") {
        setVError("No speech detected — try again, or type your note.");
      }
      // other errors (e.g. "aborted", "network") fall through to onend
    };
    recognition.onend = () => {
      const text = joinTranscript(baseRef.current, finalRef.current).trim();
      setVoiceNote(text);
      if (text) lsSet(voiceBackupKey, text);
      recognitionRef.current = null;
      setVstatus("idle");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVstatus("recording");
    } catch {
      recognitionRef.current = null;
      setVError("Couldn't start the microphone. Try again, or type your note.");
      setVstatus("idle");
    }
  }

  // BATCH fallback: record the whole clip, then transcribe via the server.
  async function startBatchRecording() {
    if (!canRecordAudio()) {
      setVError("Recording isn't available on this device — type your note below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); // release the mic
        recorderRef.current = null;
        setVstatus("transcribing");
        try {
          const recorded = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
          const { base64, mimeType: outMime } = await blobToWavBase64(recorded);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, mimeType: outMime }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Transcription failed.");
          const transcript = String(data.transcript ?? "").trim();
          if (transcript) {
            setVoiceNote((prev) => {
              const next = prev ? `${prev.trimEnd()} ${transcript}` : transcript;
              lsSet(voiceBackupKey, next);
              return next;
            });
          } else {
            setVError("No speech detected — try again, or type your note.");
          }
        } catch (err) {
          setVError(err instanceof Error ? err.message : "Couldn't transcribe — type your note.");
        } finally {
          setVstatus("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setVstatus("recording");
    } catch {
      setVError("Microphone blocked. Allow mic access, or type your note below.");
      setVstatus("idle");
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
    setChipTime("");
    setGroupValues({});
    setPhotos([]);
    setEntryQuestions([]);
  }

  // Save the voice/typed free-text as a Note entry, then return to capture.
  async function handleVoiceSubmit(formData: FormData) {
    await addLogEntry(formData);
    lsRemove(voiceBackupKey);
    setVoiceNote("");
    setVstatus("idle");
    setVError("");
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
              {tiles.map((key) => {
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
              supportNeeds={supportNeeds}
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

            {/* AI nudge: a few human, specific prompts for THIS entry. Optional — the
                worker taps one to drop it into the note and answers it. */}
            <button
              type="button"
              onClick={handleSuggestQuestions}
              disabled={loadingQuestions}
              className="flex h-10 items-center justify-center gap-2 self-start rounded-full border border-brand bg-brand-tint px-4 text-sm font-bold text-brand transition-colors hover:bg-brand-tint/70 disabled:opacity-60"
            >
              {loadingQuestions ? "Thinking…" : "✨ Suggest what to add"}
            </button>
            {entryQuestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted">
                  Tap one to add it to your note, then answer it:
                </span>
                {entryQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => insertQuestion(q)}
                    className="rounded-2xl border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-sunk"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <input type="hidden" name="photos" value={JSON.stringify(photos)} />

            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">When did this happen?</span>
                {adjusting ? (
                  <>
                    <input
                      type="time"
                      name="loggedTime"
                      value={chipTime}
                      onChange={(e) => setChipTime(e.target.value)}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-base text-foreground focus:border-brand focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjusting(false)}
                      className="font-medium text-brand"
                    >
                      Now
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-muted">Now</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChipTime(nowHHMM());
                        setAdjusting(true);
                      }}
                      className="font-medium text-brand"
                    >
                      Set a time
                    </button>
                  </>
                )}
              </div>
              <PhotoInput photos={photos} onChange={setPhotos} iconOnly />
            </div>
            {/* Warn (don't block) when a back-logged time falls outside the shift. */}
            {chipTimeWarning && (
              <p className="text-[11px] font-semibold text-clay">
                {chipTimeWarning === "before_start"
                  ? "That's before this shift started — check the time."
                  : "That's after now — check the time."}
              </p>
            )}

            <SubmitButton label={selectedCat?.label ?? selected} />
          </form>
        ))}

      {/* VOICE — record → transcribe → editable free-text that saves as a Note */}
      {view === "voice" && drafts === null && (
        <div className="flex flex-1 flex-col items-center gap-4 pt-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={vstatus === "transcribing"}
            aria-pressed={vstatus === "recording"}
            aria-label={vstatus === "recording" ? "Stop recording" : "Start recording"}
            className="flex h-24 w-24 items-center justify-center rounded-full text-white transition-shadow disabled:opacity-70"
            style={{
              background: vstatus === "recording" ? "#b23a28" : "var(--clay)",
              boxShadow:
                vstatus === "recording"
                  ? "0 0 0 10px rgba(223,91,64,.16)"
                  : "0 12px 24px rgba(223,91,64,.40)",
            }}
          >
            {vstatus === "transcribing" ? <Spinner /> : <MicIcon size={34} />}
          </button>
          <div className="text-center">
            <div className="font-display text-base font-bold text-foreground">
              {vstatus === "recording"
                ? "Recording… tap to stop"
                : vstatus === "transcribing"
                  ? "Transcribing…"
                  : "Tap to record"}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-muted">
              {vError
                ? vError
                : vstatus === "recording"
                  ? "Listening — the transcript appears below as you speak."
                  : "Speak your note, then review the transcript before saving."}
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
              // Read-only while live dictation is streaming in, so an interim update
              // can't clobber a mid-recording edit. Editable again once stopped.
              readOnly={vstatus === "recording"}
              onChange={(e) => {
                setVoiceNote(e.target.value);
                lsSet(voiceBackupKey, e.target.value);
              }}
              placeholder="Transcript appears here — or type a note…"
              className="h-28 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-brand focus:outline-none read-only:opacity-90"
            />
            {/* Split a narrative note into structured, categorised entries (review first). */}
            {voiceNote.trim() && vstatus === "idle" && (
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-brand bg-brand-tint text-sm font-bold text-brand transition-colors hover:bg-brand-tint/70 disabled:opacity-60"
              >
                {extracting ? "Analysing…" : "✨ Split into log entries"}
              </button>
            )}
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

      {/* VOICE → REVIEW the extracted entries before creating them (Rule 11). */}
      {view === "voice" && drafts !== null && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold text-foreground">
              Review {drafts.length} {drafts.length === 1 ? "entry" : "entries"}
            </span>
            <button
              type="button"
              onClick={() => setDrafts(null)}
              className="flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-muted"
            >
              ← Back
            </button>
          </div>
          <p className="text-[11px] font-semibold text-muted">
            Check each entry — especially times tagged{" "}
            <span className="text-clay">estimated</span>. The original note is kept too.
          </p>

          <div className="flex flex-col gap-2.5">
            {drafts.map((d, i) => {
              const windowWarn = timeWindowWarning(d.time, shiftStartHHMM, nowHHMM());
              const prev = i > 0 ? minutesOfDay(drafts[i - 1].time) : null;
              const cur = minutesOfDay(d.time);
              const outOfOrder = prev != null && cur != null && cur < prev;
              return (
              <div key={i} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={d.category}
                    onChange={(e) => updateDraft(i, { category: e.target.value })}
                    className="h-10 flex-1 rounded-xl border border-border bg-surface px-2 text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
                  >
                    {LOG_CATEGORIES.filter((c) => c.key !== "Note").map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={d.time}
                    // Editing the time counts as the worker confirming it (clears the
                    // "estimated" flag).
                    onChange={(e) => updateDraft(i, { time: e.target.value, timeEstimated: false })}
                    className={`h-10 rounded-xl border bg-surface px-2 text-sm text-foreground focus:outline-none ${
                      d.timeEstimated || windowWarn || outOfOrder
                        ? "border-clay focus:border-clay"
                        : "border-border focus:border-brand"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeDraft(i)}
                    aria-label="Remove entry"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-border text-lg text-muted"
                  >
                    ×
                  </button>
                </div>
                {/* Time confirmation cues (warn, never block). */}
                {(d.timeEstimated || windowWarn || outOfOrder) && (
                  <p className="text-[11px] font-semibold text-clay">
                    {windowWarn === "before_start"
                      ? "Before the shift started — check the time."
                      : windowWarn === "after_end"
                        ? "After now — check the time."
                        : outOfOrder
                          ? "Out of order — check the time."
                          : "Estimated time — confirm it's right."}
                  </p>
                )}
                {d.detail && (
                  <div className="text-[11px] font-bold text-brand">{d.detail}</div>
                )}
                <input
                  value={d.notes}
                  onChange={(e) => updateDraft(i, { notes: e.target.value })}
                  placeholder="Add a note (optional)"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
                />
                {/* AI prompts for this entry — auto-suggested for empty notes; tap to
                    re-ask anytime. Tapping a prompt drops it into this entry's note. */}
                {(draftQuestions[i] ?? []).length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {(draftQuestions[i] ?? []).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => insertDraftQuestion(i, q)}
                        className="rounded-xl border border-border bg-surface px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-surface-sunk"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => suggestForDraft(i)}
                    disabled={draftQLoading[i]}
                    className="self-start text-[12px] font-bold text-brand disabled:opacity-60"
                  >
                    {draftQLoading[i] ? "Thinking…" : "✨ Suggest what to add"}
                  </button>
                )}
              </div>
              );
            })}
          </div>

          {vError && <p className="text-[11px] font-semibold text-clay">{vError}</p>}

          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={() => setDrafts(null)}
              className="h-12 w-28 rounded-[14px] border border-[#e3d6c1] bg-surface text-sm font-bold text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmExtraction}
              disabled={committing}
              className="h-12 flex-1 rounded-[14px] bg-brand px-5 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
            >
              {committing ? "Creating…" : `Create ${drafts.length} ${drafts.length === 1 ? "entry" : "entries"}`}
            </button>
          </div>
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
  return hhmmLocal(new Date());
}

function hhmmLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Join the pre-existing note text with freshly transcribed text, collapsing the
// run of spaces this can create at the seam (and between speech segments) so words
// never run together or get double-spaced.
function joinTranscript(base: string, body: string): string {
  return `${base}${body}`.replace(/[ \t]{2,}/g, " ");
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

// Spinning ring shown on the record button while a recording is being transcribed.
function Spinner({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
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
