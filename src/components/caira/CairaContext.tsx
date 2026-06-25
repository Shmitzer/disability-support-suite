"use client";

import { createContext, useContext, useState } from "react";

export type CairaMode = "logo" | "expanded" | "recording";

type CairaContextValue = {
  mode: CairaMode;
  setMode: (mode: CairaMode) => void;
  /** Org-wide switch: when false the character system is hidden everywhere. */
  enabled: boolean;
};

const CairaContext = createContext<CairaContextValue | null>(null);

export function CairaProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [mode, setMode] = useState<CairaMode>("logo");
  return (
    <CairaContext.Provider value={{ mode, setMode, enabled }}>
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
