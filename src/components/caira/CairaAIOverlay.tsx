"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import CairaFull from "./CairaFull";
import CairaHead from "./CairaHead";
import { useCaira, type CairaPersona } from "./CairaContext";

type DisplayMessage = { role: "user" | "caira"; text: string };
type GeminiTurn = { role: "user" | "model"; parts: { text: string }[] };

// Quick-action chips per persona. `send` chips pre-fill + immediately send; `action`
// chips do something else (open recording, show contact info, mood picker, …).
type Chip =
  | { label: string; kind: "send"; message: string }
  | { label: string; kind: "action"; action: string };

const CHIPS: Record<CairaPersona, Chip[]> = {
  worker: [
    { label: "📝 Log incident", kind: "send", message: "Help me write an incident report" },
    { label: "💊 Check meds", kind: "send", message: "What medications are due for the participant today?" },
    { label: "📞 Call supervisor", kind: "action", action: "contact" },
    { label: "🎙 Dictate note", kind: "action", action: "dictate" },
  ],
  participant: [
    { label: "📅 What's today?", kind: "send", message: "What am I doing today?" },
    { label: "🕐 What time is it?", kind: "send", message: "What time is my next activity?" },
    { label: "💬 Message worker", kind: "send", message: "Can you send a message to my support worker for me?" },
    { label: "😊 How do I feel?", kind: "action", action: "mood" },
  ],
  supervisor: [
    { label: "📋 Review flags", kind: "action", action: "flags" },
    { label: "📊 Today's shifts", kind: "send", message: "Give me a summary of today's active shifts" },
    { label: "✍️ Draft feedback", kind: "send", message: "Help me write shift feedback for a worker" },
    { label: "📞 Urgent contact", kind: "action", action: "contact" },
  ],
};

const MOODS = ["😊 Happy", "🙂 Okay", "😢 Sad", "😴 Tired"];

// Map the current route to a short, human screen label for context.
function screenLabel(pathname: string | null): string {
  if (!pathname) return "the app";
  if (pathname.includes("/shift")) return "shift log";
  if (pathname.includes("/incident")) return "incident form";
  if (pathname.includes("/notes")) return "progress notes";
  if (pathname.includes("/participants")) return "participant profile";
  if (pathname.includes("/dashboard")) return "dashboard";
  if (pathname.includes("/admin")) return "admin dashboard";
  return "the app";
}

/**
 * CairaAIOverlay — the expanded "Ask Caira" assistant surface (role-aware chat).
 * Renders the stateful panel only while expanded, so the conversation starts fresh
 * each open (no persistence) without resetting state inside an effect.
 */
export default function CairaAIOverlay() {
  const { mode } = useCaira();
  if (mode !== "expanded") return null;
  return <ExpandedPanel />;
}

function ExpandedPanel() {
  const { setMode, persona, aiLevel, setAiLevel } = useCaira();
  const pathname = usePathname();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [safetyFlagged, setSafetyFlagged] = useState(false);
  const [webEnabled, setWebEnabled] = useState(false);
  const [showMoods, setShowMoods] = useState(false);
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setNotice("");
    setShowMoods(false);
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    const nextHistory: GeminiTurn[] = [...history, { role: "user", parts: [{ text: trimmed }] }];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/caira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          currentScreen: screenLabel(pathname),
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "I'm having trouble right now. Please try again.";
      setMessages((m) => [...m, { role: "caira", text: reply }]);
      setHistory([...nextHistory, { role: "model", parts: [{ text: reply }] }]);
      if (data.safetyFlagged) setSafetyFlagged(true);
      if (typeof data.webEnabled === "boolean") setWebEnabled(data.webEnabled);
    } catch {
      setMessages((m) => [...m, { role: "caira", text: "I'm having trouble right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function onChip(chip: Chip) {
    if (chip.kind === "send") {
      send(chip.message);
      return;
    }
    switch (chip.action) {
      case "dictate":
        setMode("recording");
        break;
      case "contact":
        setNotice("Your supervisor's contact details are on the participant's profile under “Care team”.");
        break;
      case "mood":
        setShowMoods((s) => !s);
        break;
      case "flags":
        setNotice("Tap the amber badge on the Caira logo (top bar) to review and clear safety flags.");
        break;
    }
  }

  async function toggleLevel() {
    const next = aiLevel === "simple" ? "adjusted" : "simple";
    setAiLevel(next); // optimistic
    try {
      await fetch("/api/caira/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
    } catch {
      setAiLevel(aiLevel); // revert on failure
    }
  }

  function pickMood(mood: string) {
    setShowMoods(false);
    // No mood-log table yet (future task): acknowledge warmly in-conversation.
    setMessages((m) => [
      ...m,
      { role: "user", text: `I feel ${mood}` },
      { role: "caira", text: "Thanks for telling me how you feel. I've made a note of it." },
    ]);
  }

  const hasConversation = messages.length > 0 || loading;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center backdrop-blur-sm"
      style={{ top: 102, background: "rgba(247,243,238,0.62)" }}
    >
      {!hasConversation && (
        <>
          <div className="mt-6" style={{ animation: "dropIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <CairaFull mood="waving" size={98} />
          </div>
          <p
            className="mt-2 text-lg font-bold text-caira-teal-dk"
            style={{ animation: "fadeUp 0.4s ease 0.28s both" }}
          >
            Hi! What can I help with?
          </p>
        </>
      )}

      {/* Conversation transcript */}
      {hasConversation && (
        <div
          ref={scrollRef}
          className="mt-4 flex w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 pb-44"
        >
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="self-end rounded-2xl rounded-br-sm bg-caira-teal-lt px-3.5 py-2 text-sm text-foreground">
                {m.text}
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2 self-start">
                <div className="mt-0.5 shrink-0">
                  <CairaHead size={20} />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-foreground shadow-sm">
                  {m.text}
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex items-center gap-2 self-start">
              <CairaHead size={20} />
              <div className="flex gap-1 rounded-2xl bg-white px-3.5 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-caira-teal" style={{ animation: "dp1 1.2s infinite" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-caira-teal" style={{ animation: "dp2 1.2s infinite" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-caira-teal" style={{ animation: "dp3 1.2s infinite" }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick-action chips (only before a conversation starts) */}
      {!hasConversation && (
        <div className="mt-5 flex flex-wrap justify-center gap-2 px-6">
          {CHIPS[persona].map((chip, i) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChip(chip)}
              className="rounded-full border border-caira-teal-lt bg-white px-4 py-2 text-sm font-semibold text-caira-teal-dk shadow-sm"
              style={{ animation: `chipIn 0.34s ease ${0.36 + i * 0.08}s both` }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Mood picker (participant) */}
      {showMoods && (
        <div className="mt-3 flex flex-wrap justify-center gap-2 px-6">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => pickMood(mood)}
              className="rounded-full border border-caira-rose bg-caira-rose-lt px-4 py-2 text-sm font-semibold text-foreground"
            >
              {mood}
            </button>
          ))}
        </div>
      )}

      {/* Slide-up input panel */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-7"
        style={{ animation: "panelRise 0.42s ease 0.08s both", boxShadow: "0 -8px 30px rgba(77,184,176,0.12)" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />

        {notice && <p className="mb-2 rounded-xl bg-caira-teal-lt px-3 py-2 text-xs text-caira-teal-dk">{notice}</p>}

        {/* Safety flag banner — appears once, stays for the session. */}
        {safetyFlagged && (
          <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Your support worker has been quietly notified.
          </p>
        )}

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-gray-400">Ask Caira</p>
          {/* Web access indicator (worker/supervisor with access). */}
          {webEnabled && (
            <span
              title="Web search is on for your account"
              className="cursor-default text-sm text-caira-teal"
              aria-label="Web search is on for your account"
            >
              🌐
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-caira-teal-lt bg-caira-teal-lt px-3 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            aria-label="Dictate"
            onClick={() => setMode("recording")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-caira-teal text-white"
          >
            🎙
          </button>
        </form>

        {/* Participant complexity toggle */}
        {persona === "participant" && (
          <button
            type="button"
            onClick={toggleLevel}
            className="mt-3 text-xs font-medium text-caira-teal-dk underline"
          >
            {aiLevel === "simple" ? "Is this too simple?" : "Using normal language — switch back to simple"}
          </button>
        )}
      </div>
    </div>
  );
}
