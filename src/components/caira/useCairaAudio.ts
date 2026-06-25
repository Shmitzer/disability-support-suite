"use client";

import { useEffect, useRef } from "react";
import type { CairaMood } from "./CairaFull";
import type { CairaMode } from "./CairaContext";
import {
  playWave,
  startThinking,
  stopThinking,
  playExcited,
  playError,
  playRecordStart,
  playRecordStop,
  playSleep,
  playIdle,
} from "@/lib/caira/audioManager";

/**
 * useCairaAudio — maps Caira mood/mode changes to her state sounds.
 * All playback is a no-op when muted or when audio is unavailable (handled in the
 * audioManager). Only fires on actual transitions, so re-renders are silent.
 */
export function useCairaAudio(mood: CairaMood, mode: CairaMode) {
  const prevMood = useRef<CairaMood>("idle");
  const prevMode = useRef<CairaMode>("logo");

  // Mode changes → record start/stop chirps.
  useEffect(() => {
    if (mode !== prevMode.current) {
      if (mode === "recording") playRecordStart();
      if (mode === "logo" && prevMode.current === "recording") playRecordStop();
      prevMode.current = mode;
    }
  }, [mode]);

  // Mood changes → the per-state sound.
  useEffect(() => {
    if (mood === prevMood.current) return;

    // Leaving thinking/listening: stop the continuous hum.
    if (prevMood.current === "thinking" || prevMood.current === "listening") {
      stopThinking();
    }

    switch (mood) {
      case "waving":
        playWave();
        break;
      case "thinking":
      case "listening":
        startThinking(); // same hum for both
        break;
      case "excited":
        playExcited();
        break;
      case "error":
        playError();
        break;
      case "sleeping":
        playSleep();
        break;
      case "idle":
        if (prevMood.current !== "idle") playIdle();
        break;
    }

    prevMood.current = mood;
  }, [mood]);

  // Safety net: if a component humming (thinking/listening) unmounts, stop the hum so
  // it can't get stuck on. The hum is a module-level singleton, so this is correct.
  useEffect(() => {
    return () => {
      if (prevMood.current === "thinking" || prevMood.current === "listening") {
        stopThinking();
      }
    };
  }, []);
}
