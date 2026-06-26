"use client";

import { useEffect, useRef } from "react";
import type { CairaState } from "./states";
import type { CairaMode } from "./CairaContext";
import {
  playWave,
  playExcited,
  playError,
  playIdle,
  playRecordStart,
  playRecordStop,
} from "@/lib/caira/audioManager";

/**
 * useCairaAudio — maps the 5 canonical states (+ record mode) to Caira's soft sounds.
 * No-op when muted or audio is unavailable (handled in the audioManager). Only fires
 * on real transitions, so re-renders stay silent. The old looping "thinking" hum is
 * gone — no state maps to a continuous tone (idle must stay silent; she's everywhere).
 */
export function useCairaAudio(state: CairaState, mode: CairaMode) {
  const prevState = useRef<CairaState>("idle");
  const prevMode = useRef<CairaMode>("logo");

  // Mode changes → record start/stop chirps.
  useEffect(() => {
    if (mode !== prevMode.current) {
      if (mode === "recording") playRecordStart();
      if (mode === "logo" && prevMode.current === "recording") playRecordStop();
      prevMode.current = mode;
    }
  }, [mode]);

  // State changes → the per-state sound.
  useEffect(() => {
    if (state === prevState.current) return;
    switch (state) {
      case "greet":
        playWave();
        break;
      case "cheer":
      case "goal":
        playExcited();
        break;
      case "reassure":
        playError();
        break;
      case "idle":
        if (prevState.current !== "idle") playIdle();
        break;
    }
    prevState.current = state;
  }, [state]);
}
