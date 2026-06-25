"use client";

import { createContext, useContext, useState } from "react";

export type CairaMode = "logo" | "expanded" | "recording";
export type CairaPersona = "worker" | "participant" | "supervisor";

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
  return (
    <CairaContext.Provider value={{ mode, setMode, enabled, persona, aiLevel, setAiLevel }}>
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
