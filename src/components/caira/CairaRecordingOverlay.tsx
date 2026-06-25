"use client";

import { useEffect, useState } from "react";
import CairaFull from "./CairaFull";
import { useCaira } from "./CairaContext";

const TRANSCRIPT_WORDS =
  "Participant arrived calm at 8:15am. Assisted with morning medication — two tablets taken without issue. Breakfast was toast and tea, eaten well. Participant engaged in conversation about weekend plans...".split(
    " "
  );

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
 * CairaRecordingOverlay — listening surface shown while dictating.
 * Renders the stateful panel only while recording, so timer + transcript
 * state starts fresh each session (no reset-in-effect needed).
 */
export default function CairaRecordingOverlay() {
  const { mode } = useCaira();
  if (mode !== "recording") return null;
  return <RecordingPanel />;
}

function RecordingPanel() {
  const [recSecs, setRecSecs] = useState(0);
  const [revealed, setRevealed] = useState(0);

  // Timer + live-typed transcript; cleaned up when the panel unmounts.
  useEffect(() => {
    const tick = setInterval(() => setRecSecs((s) => s + 1), 1000);
    const reveal = setInterval(
      () => setRevealed((n) => Math.min(n + 1, TRANSCRIPT_WORDS.length)),
      300
    );
    return () => {
      clearInterval(tick);
      clearInterval(reveal);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center backdrop-blur-sm"
      style={{ top: 102, background: "rgba(247,243,238,0.62)" }}
    >
      <div
        className="relative mt-8"
        style={{
          animation: "helperDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {[0, 0.45, 0.9].map((d) => (
          <span
            key={d}
            className="absolute rounded-full border-2 border-caira-teal"
            style={{
              inset: -24,
              animation: `ripple 1.9s ease-out infinite`,
              animationDelay: `${d}s`,
            }}
          />
        ))}
        <CairaFull mood="listening" size={92} />
      </div>

      <p
        className="mt-3 text-lg font-bold text-caira-teal-dk"
        style={{ animation: "fadeUp 0.4s ease 0.28s both" }}
      >
        I&apos;ve got this — keep going ✓
      </p>

      <div className="mt-4 flex h-10 items-center gap-1">
        {BARS.map((b, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-caira-teal"
            style={{
              height: 28,
              transformOrigin: "center",
              animation: `waveBar ${b.dur}s ease-in-out infinite`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Live transcription panel */}
      <div
        className="absolute left-4 right-4 rounded-2xl border border-caira-teal-lt bg-white p-4"
        style={{
          bottom: 88,
          animation: "panelRise 0.38s ease 0.12s both",
          boxShadow: "0 8px 30px rgba(77,184,176,0.12)",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full bg-clay"
            style={{ animation: "recPulse 1.4s ease-in-out infinite" }}
          />
          <span className="text-xs font-semibold text-gray-500">
            Recording · {fmt(recSecs)}
          </span>
        </div>
        <p className="text-sm italic leading-relaxed text-foreground">
          {TRANSCRIPT_WORDS.slice(0, revealed).join(" ")}
          <span
            className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-caira-teal align-middle"
            style={{ animation: "waveBar 0.8s steps(1) infinite" }}
          />
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Caira will format &amp; save when you stop
        </p>
      </div>
    </div>
  );
}
