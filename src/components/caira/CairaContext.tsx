"use client";

import { createContext, useContext, useState } from "react";

export type CairaMode = "logo" | "expanded" | "recording";

type CairaContextValue = {
  mode: CairaMode;
  setMode: (mode: CairaMode) => void;
};

const CairaContext = createContext<CairaContextValue | null>(null);

export function CairaProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<CairaMode>("logo");
  return (
    <CairaContext.Provider value={{ mode, setMode }}>
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
