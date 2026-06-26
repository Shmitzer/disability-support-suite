"use client";

import { CAIRA_ASPECT, type CairaState } from "./states";

// Per-state CSS animation class (defined in caira.css). The static renderer can only
// transform the whole cutout (bob/squash/tilt) — full limb articulation arrives with
// the Rive rig. Reduced-motion is handled in caira.css (animations disabled there).
const ANIM_CLASS: Record<CairaState, string> = {
  greet: "caira-anim-greet",
  cheer: "caira-anim-cheer",
  reassure: "caira-anim-reassure",
  idle: "caira-anim-idle",
  goal: "caira-anim-goal",
};

/**
 * CairaStatic — renders the exact retouched cutout (public/caira/caira-master.png)
 * with gentle per-state motion. This is the canonical look until the Rive rig lands,
 * and the permanent reduced-motion / lightweight fallback.
 */
export default function CairaStatic({
  state = "idle",
  size = 100,
  quiet = false,
}: {
  state?: CairaState;
  size?: number;
  quiet?: boolean;
}) {
  const height = Math.round(size / CAIRA_ASPECT);
  return (
    <div
      className={`caira-static ${ANIM_CLASS[state]} ${quiet ? "caira-quiet" : ""}`}
      style={{ width: size, height, filter: "drop-shadow(0 8px 18px rgba(90,65,55,0.22))" }}
    >
      {/* Local public asset — plain img avoids next/image remote config; it's tiny. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/caira/caira-master.png"
        alt="Caira"
        width={size}
        height={height}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
      />
    </div>
  );
}
