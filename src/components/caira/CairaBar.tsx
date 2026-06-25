"use client";

import { useEffect, useState } from "react";
import CairaHead from "./CairaHead";
import { useCaira } from "./CairaContext";

/**
 * CairaBar — persistent top nav bar housing the wandering Caira logo.
 */
export default function CairaBar() {
  const { mode, setMode } = useCaira();

  const [logoX, setLogoX] = useState(20);
  const [dir, setDir] = useState<1 | -1>(1);
  const [blink, setBlink] = useState(false);

  // Wander the logo left/right while in logo mode.
  useEffect(() => {
    if (mode !== "logo") return;
    const id = setInterval(() => {
      setLogoX((x) => {
        const next = x + dir * 2;
        if (next > 78) setDir(-1);
        else if (next < 14) setDir(1);
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [mode, dir]);

  // Blink.
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 110);
    }, 2700);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-40 h-[58px] border-b border-caira-teal-lt bg-white"
      style={{ boxShadow: "0 2px 10px rgba(77,184,176,0.08)" }}
    >
      <div className="relative flex h-full items-center justify-between px-4">
        <span className="text-lg font-bold tracking-wide text-caira-teal-dk">
          caira
        </span>

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

        {mode === "logo" && (
          <button
            type="button"
            aria-label="Open Caira assistant"
            onClick={() => setMode("expanded")}
            className="absolute"
            style={{
              left: `${logoX}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              transition: "left 0.09s linear",
            }}
          >
            <div
              className="rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(77,184,176,0.2) 0%, rgba(77,184,176,0) 70%)",
              }}
            >
              <CairaHead size={38} blink={blink} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
