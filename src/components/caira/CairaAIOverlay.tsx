"use client";

import CairaFull from "./CairaFull";
import { useCaira } from "./CairaContext";

const CHIPS = [
  "📝 Log incident",
  "💊 Check meds",
  "📞 Call supervisor",
  "🎙 Dictate note",
];

/** CairaAIOverlay — the expanded "Ask Caira" assistant surface. */
export default function CairaAIOverlay() {
  const { mode } = useCaira();
  if (mode !== "expanded") return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center backdrop-blur-sm"
      style={{ top: 102, background: "rgba(247,243,238,0.62)" }}
    >
      <div
        className="mt-6"
        style={{ animation: "dropIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <CairaFull mood="waving" size={98} />
      </div>

      <p
        className="mt-2 text-lg font-bold text-caira-teal-dk"
        style={{ animation: "fadeUp 0.4s ease 0.28s both" }}
      >
        Hi! What can I help with?
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2 px-6">
        {CHIPS.map((chip, i) => (
          <button
            key={chip}
            type="button"
            className="rounded-full border border-caira-teal-lt bg-white px-4 py-2 text-sm font-semibold text-caira-teal-dk shadow-sm"
            style={{
              animation: `chipIn 0.34s ease ${0.36 + i * 0.08}s both`,
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Slide-up panel */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-7"
        style={{
          animation: "panelRise 0.42s ease 0.08s both",
          boxShadow: "0 -8px 30px rgba(77,184,176,0.12)",
        }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
        <p className="mb-2 text-xs uppercase tracking-widest text-gray-400">
          Ask Caira
        </p>
        <div className="flex items-center gap-2 rounded-2xl border border-caira-teal-lt bg-caira-teal-lt px-3 py-2">
          <input
            type="text"
            placeholder="Type your question…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            aria-label="Voice input"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-caira-teal text-white"
          >
            🎙
          </button>
        </div>
      </div>
    </div>
  );
}
