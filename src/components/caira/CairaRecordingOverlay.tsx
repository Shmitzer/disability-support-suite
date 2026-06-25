"use client";

import { useEffect, useRef, useState } from "react";
import CairaFull from "./CairaFull";
import { useCaira } from "./CairaContext";
import { getSpeechRecognition, type SpeechRecognitionLike } from "@/lib/audio";

// 17 bars with varied durations/delays for a lively waveform.
const BARS = Array.from({ length: 17 }, (_, i) => ({
  dur: 0.38 + ((i * 7) % 33) / 100, // 0.38–0.70s, deterministic
  delay: ((i * 5) % 11) / 20,
}));

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * CairaRecordingOverlay — real-time dictation surface.
 * Renders the stateful panel only while in recording mode, so its state starts
 * fresh each session. Uses the Web Speech API for live transcription, then asks
 * Caira to format the transcript into a shift-note draft for the worker to review.
 */
export default function CairaRecordingOverlay() {
  const { mode } = useCaira();
  if (mode !== "recording") return null;
  return <RecordingPanel />;
}

type Phase = "recording" | "processing" | "review" | "unsupported";

function RecordingPanel() {
  const { setMode } = useCaira();
  const [recSecs, setRecSecs] = useState(0);
  const [transcript, setTranscript] = useState("");
  // Derive the initial phase from speech support (this panel only mounts client-side
  // via a user tap, so the initializer runs with `window` present).
  const [phase, setPhase] = useState<Phase>(() =>
    getSpeechRecognition() ? "recording" : "unsupported",
  );
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const transcriptRef = useRef(""); // latest transcript for the stop handler

  // Timer.
  useEffect(() => {
    if (phase !== "recording") return;
    const tick = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  // Start live transcription on mount.
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return; // phase already initialised to "unsupported"
    const recognition = new SpeechRecognition();
    recognition.lang = "en-AU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      // Rebuild from the whole results list each event (continuous re-reports finals).
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      finalRef.current = finalText;
      const full = (finalText + interim).trim();
      transcriptRef.current = full;
      setTranscript(full);
    };
    recognition.onerror = () => {
      /* transient; the worker can stop and retry */
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Defer so we don't setState synchronously in the effect body.
      Promise.resolve().then(() => setPhase("unsupported"));
    }
    return () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  async function handleStop() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    const text = transcriptRef.current.trim();
    if (!text) {
      setMode("logo");
      return;
    }
    setPhase("processing");
    try {
      const res = await fetch("/api/caira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: [], isVoiceNote: true }),
      });
      const data = await res.json();
      setDraft((data.reply ?? text).trim());
    } catch {
      setDraft(text); // fall back to the raw transcript
    }
    setPhase("review");
  }

  function handleSave() {
    // Decoupled hand-off: pages with a note field (e.g. ShiftTracker) listen for this
    // and drop the draft in. Works regardless of which screen opened the overlay.
    window.dispatchEvent(new CustomEvent("caira:voice-note", { detail: { text: draft } }));
    setMode("logo");
  }

  // ── Review state ───────────────────────────────────────────────────────────
  if (phase === "review") {
    return (
      <Shell>
        <div className="mt-6" style={{ animation: "dropIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <CairaFull mood="excited" size={84} />
        </div>
        <p className="mt-2 text-lg font-bold text-caira-teal-dk">Here&apos;s what I heard — does this look right?</p>
        <div
          className="absolute left-4 right-4 rounded-2xl border border-caira-teal-lt bg-white p-4"
          style={{ bottom: 24, boxShadow: "0 8px 30px rgba(77,184,176,0.12)" }}
        >
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-xl border border-caira-teal-lt bg-caira-teal-lt p-2 text-sm text-foreground outline-none"
            />
          ) : (
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {draft}
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode("logo")}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="rounded-xl border border-caira-teal-lt px-3 py-2 text-sm font-semibold text-caira-teal-dk"
            >
              {editing ? "Done editing" : "Edit"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-caira-teal px-4 py-2 text-sm font-bold text-white"
            >
              Save to note
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Unsupported state ────────────────────────────────────────────────────────
  if (phase === "unsupported") {
    return (
      <Shell>
        <div className="mt-8">
          <CairaFull mood="idle" size={84} />
        </div>
        <div
          className="absolute left-4 right-4 rounded-2xl border border-caira-teal-lt bg-white p-4 text-center"
          style={{ bottom: 24 }}
        >
          <p className="text-sm text-foreground">
            Voice isn&apos;t available on this browser. Use the text input instead.
          </p>
          <button
            type="button"
            onClick={() => setMode("expanded")}
            className="mt-3 rounded-xl bg-caira-teal px-4 py-2 text-sm font-bold text-white"
          >
            Type instead
          </button>
        </div>
      </Shell>
    );
  }

  // ── Recording / processing state ─────────────────────────────────────────────
  return (
    <Shell>
      <div className="relative mt-8" style={{ animation: "helperDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        {[0, 0.45, 0.9].map((d) => (
          <span
            key={d}
            className="absolute rounded-full border-2 border-caira-teal"
            style={{ inset: -24, animation: "ripple 1.9s ease-out infinite", animationDelay: `${d}s` }}
          />
        ))}
        <CairaFull mood={phase === "processing" ? "thinking" : "listening"} size={92} />
      </div>

      <p className="mt-3 text-lg font-bold text-caira-teal-dk" style={{ animation: "fadeUp 0.4s ease 0.28s both" }}>
        {phase === "processing" ? "Tidying that up…" : "I've got this — keep going ✓"}
      </p>

      {phase === "recording" && (
        <div className="mt-4 flex h-10 items-center gap-1">
          {BARS.map((b, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-caira-teal"
              style={{ height: 28, transformOrigin: "center", animation: `waveBar ${b.dur}s ease-in-out infinite`, animationDelay: `${b.delay}s` }}
            />
          ))}
        </div>
      )}

      {/* Live transcription + stop */}
      <div
        className="absolute left-4 right-4 rounded-2xl border border-caira-teal-lt bg-white p-4"
        style={{ bottom: 24, animation: "panelRise 0.38s ease 0.12s both", boxShadow: "0 8px 30px rgba(77,184,176,0.12)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-clay" style={{ animation: "recPulse 1.4s ease-in-out infinite" }} />
          <span className="text-xs font-semibold text-gray-500">Recording · {fmt(recSecs)}</span>
        </div>
        <p className="max-h-32 overflow-y-auto text-sm italic leading-relaxed text-foreground">
          {transcript || <span className="text-gray-400">Listening… start talking.</span>}
          {phase === "recording" && (
            <span
              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-caira-teal align-middle"
              style={{ animation: "waveBar 0.8s steps(1) infinite" }}
            />
          )}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">Caira will format &amp; save when you stop</p>
          <button
            type="button"
            onClick={handleStop}
            disabled={phase === "processing"}
            className="rounded-full bg-clay px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {phase === "processing" ? "Working…" : "Stop"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// Shared full-screen blur shell for every phase.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center backdrop-blur-sm"
      style={{ top: 102, background: "rgba(247,243,238,0.62)" }}
    >
      {children}
    </div>
  );
}
