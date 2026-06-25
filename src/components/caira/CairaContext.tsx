"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CairaMode = "logo" | "expanded" | "recording";
export type CairaPersona = "worker" | "participant" | "supervisor";

const MUTE_KEY = "cairaSoundMuted";

type CairaContextValue = {
  mode: CairaMode;
  setMode: (mode: CairaMode) => void;
  /** Org-wide switch: when false the character system is hidden everywhere. */
  enabled: boolean;
  /** Which persona the signed-in user maps to (drives chips, prompts, flag badge). */
  persona: CairaPersona;
  /** Participant language level; only meaningful for the participant persona. */
  aiLevel: "simple" | "adjusted";
  setAiLevel: (level: "simple" | "adjusted") => void;
  /** Whether Caira's state sounds are muted (persisted in localStorage). */
  muted: boolean;
  setMuted: (value: boolean) => void;
};

const CairaContext = createContext<CairaContextValue | null>(null);

export function CairaProvider({
  children,
  enabled = true,
  persona = "worker",
  initialAiLevel = "simple",
}: {
  children: React.ReactNode;
  enabled?: boolean;
  persona?: CairaPersona;
  initialAiLevel?: "simple" | "adjusted";
}) {
  const [mode, setMode] = useState<CairaMode>("logo");
  const [aiLevel, setAiLevel] = useState<"simple" | "adjusted">(initialAiLevel);
  // Start unmuted for a stable SSR render, then hydrate the real preference + sync the
  // audio engine on mount (avoids a server/client hydration mismatch).
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "true";
    // Defer the state sync so we don't setState synchronously in the effect body
    // (also lands post-hydration, avoiding a server/client mismatch on the icon).
    if (stored) Promise.resolve().then(() => setMutedState(true));
    void import("@/lib/caira/audioManager").then((m) => m.setMuted(stored));
  }, []);

  const setMuted = (value: boolean) => {
    setMutedState(value);
    try {
      localStorage.setItem(MUTE_KEY, String(value));
    } catch {
      /* storage unavailable — preference just won't persist */
    }
    void import("@/lib/caira/audioManager").then((m) => m.setMuted(value));
  };

  return (
    <CairaContext.Provider
      value={{ mode, setMode, enabled, persona, aiLevel, setAiLevel, muted, setMuted }}
    >
      {children}
    </CairaContext.Provider>
  );
}

export function useCaira(): CairaContextValue {
  const ctx = useContext(CairaContext);
  if (!ctx) {
    throw new Error("useCaira must be used within a CairaProvider");
  }
  return ctx;
}
