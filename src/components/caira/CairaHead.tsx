"use client";

import { useId } from "react";

/**
 * CairaHead — head + antenna only (no body/arms/legs).
 * Used as the wandering logo in the nav bar.
 */
export default function CairaHead({
  size = 38,
  blink = false,
}: {
  size?: number;
  blink?: boolean;
}) {
  // Unique gradient id so multiple heads on a page don't collide.
  const uid = useId().replace(/:/g, "");
  const grad = `chg-${uid}`;

  return (
    <div
      style={{ filter: "drop-shadow(0 4px 10px rgba(90,65,55,0.18))" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="10 5 80 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "logoFloat 2.8s ease-in-out infinite" }}
      >
        <defs>
          <radialGradient id={grad} cx="38%" cy="26%" r="75%">
            <stop offset="0%" stopColor="#fef9f5" />
            <stop offset="100%" stopColor="#ecddd4" />
          </radialGradient>
        </defs>

        {/* Head */}
        <circle cx="50" cy="40" r="29" fill={`url(#${grad})`} />

        {/* Clay swirls */}
        <path
          d="M41 13 Q35 28 39 43 Q42 56 37 70"
          stroke="#e8aaa2"
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          opacity={0.27}
        />
        <path
          d="M61 11 Q67 26 62 41 Q58 56 65 72"
          stroke="#6bc4bc"
          strokeWidth={5.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />

        {/* Antenna */}
        <line x1="50" y1="11" x2="50" y2="19" stroke="#4db8b0" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="50" cy="10" r="4" fill="#4db8b0">
          <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Eyes */}
        <ellipse cx="41" cy="42" rx="3.4" ry={blink ? 0.5 : 4} fill="#7a6355" />
        <ellipse cx="59" cy="42" rx="3.4" ry={blink ? 0.5 : 4} fill="#7a6355" />
        {!blink && (
          <>
            <circle cx="42.2" cy="40.6" r="1.1" fill="#fff" />
            <circle cx="60.2" cy="40.6" r="1.1" fill="#fff" />
          </>
        )}

        {/* Smile */}
        <path
          d="M43 52 Q50 58 57 52"
          stroke="#7a6355"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
