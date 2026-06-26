"use client";

import { CAIRA_ASPECT } from "./states";

/**
 * CairaHead — the lightweight Caira mark for the nav bar and small avatars: just the
 * retouched cutout with a gentle float and drop shadow. No audio, no Rive runtime —
 * kept cheap because it can render in the persistent nav on every page.
 *
 * `blink` is accepted for backwards-compatibility with earlier callers but is a no-op
 * now that the mark is the photographic creature rather than a drawn face.
 */
export default function CairaHead({
  size = 38,
  blink: _blink,
}: {
  size?: number;
  blink?: boolean;
}) {
  void _blink;
  const height = Math.round(size / CAIRA_ASPECT);
  return (
    <div
      style={{
        width: size,
        height,
        filter: "drop-shadow(0 4px 10px rgba(90,65,55,0.18))",
        animation: "logoFloat 2.8s ease-in-out infinite",
      }}
    >
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
