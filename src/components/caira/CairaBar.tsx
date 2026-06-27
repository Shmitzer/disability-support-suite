"use client";

import CairaHead from "./CairaHead";
import CairaFlagBadge from "./CairaFlagBadge";
import CairaAudioToggle from "./CairaAudioToggle";
import CairaWanderController from "./CairaWanderController";
import { useCaira } from "./CairaContext";

/**
 * CairaBar — persistent top nav bar housing the wandering Caira logo.
 *
 * The wander is now handled by CairaWanderController (smoothed random walk with
 * exponential lerp + sinusoidal drift) rather than the old linear setInterval.
 * This gives her organic, intentional movement instead of mechanical bouncing.
 */
export default function CairaBar() {
  const { mode, setMode } = useCaira();

  return (
    <div
      className="fixed left-0 right-0 top-0 z-40 h-[58px] border-b border-caira-teal-lt bg-white"
      style={{ boxShadow: "0 2px 10px rgba(77,184,176,0.08)" }}
    >
      <div className="relative flex h-full items-center justify-between px-4">
        <span className="text-lg font-bold tracking-wide text-caira-teal-dk">
          caira
        </span>

        <div className="flex items-center gap-2">
          {mode === "logo" ? (
            <span className="text-xs text-gray-400">tap me ↑</span>
          ) : (
            <button
              type="button"
              onClick={() => setMode("logo")}
              className="text-xs text-gray-400 hover:text-caira-teal-dk"
            >
              ✕ dismiss
            </button>
          )}
          <CairaAudioToggle />
        </div>

        {mode === "logo" && (
          <CairaWanderController
            charWidth={38}
            charHeight={46}
            padding={0.06}
            // Mic target: right-ish side of the bar, centred vertically.
            micTarget={[0.82, 0.5]}
            style={{
              position: "absolute",
              inset: 0,
              // Exclude the right-side controls area from the wander zone
              // by right-padding the controller to ~96px.
              right: 96,
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <button
                type="button"
                aria-label="Open Caira assistant"
                onClick={() => setMode("expanded")}
                className="block rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(77,184,176,0.18) 0%, rgba(77,184,176,0) 70%)",
                }}
              >
                <CairaHead size={38} />
              </button>
              <CairaFlagBadge />
            </div>
          </CairaWanderController>
        )}
      </div>
    </div>
  );
}
