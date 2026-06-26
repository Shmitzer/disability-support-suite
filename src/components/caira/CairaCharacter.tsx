"use client";

import { useEffect, useState } from "react";
import CairaRive from "./CairaRive";
import CairaStatic from "./CairaStatic";
import { useCaira } from "./CairaContext";
import { useCairaAudio } from "./useCairaAudio";
import type { CairaState } from "./states";

/**
 * CairaCharacter — the one canonical Caira. Renders the Rive rig when available
 * (two-way state), otherwise the exact static cutout with per-state micro-motion.
 * Honours reduced-motion (still cutout) and the Quiet Caira low-stimulation variant,
 * and drives her state sounds via useCairaAudio.
 *
 * API is intentionally small and stable so the renderer underneath can change without
 * touching callers: <CairaCharacter state="idle|greet|cheer|reassure|goal" size quiet/>.
 */
export default function CairaCharacter({
  state = "idle",
  size = 100,
  quiet: quietProp,
  onEvent,
}: {
  state?: CairaState;
  size?: number;
  quiet?: boolean;
  onEvent?: (name: string) => void;
}) {
  const { mode } = useCaira();
  const [reduced, setReduced] = useState(false);
  // Gate the Rive (canvas/wasm) renderer to after first client paint: SSR and the
  // initial hydration render both show the static cutout, so there's no SSR canvas
  // work and no hydration mismatch; she upgrades to the rig once mounted.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    // Defer initial reads so we don't setState synchronously in the effect body.
    if (mq.matches) Promise.resolve().then(() => setReduced(true));
    Promise.resolve().then(() => setReady(true));
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Quiet Caira: explicit prop OR reduced-motion (low-stimulation everywhere).
  const quiet = quietProp || reduced;

  // State sounds (no-op when muted / unavailable; honours mode for record chirps).
  useCairaAudio(state, mode);

  // Reduced-motion or pre-mount → still/animated cutout; otherwise the Rive rig.
  if (reduced || !ready) return <CairaStatic state={state} size={size} quiet={quiet} />;

  return <CairaRive state={state} size={size} quiet={quiet} onEvent={onEvent} />;
}
