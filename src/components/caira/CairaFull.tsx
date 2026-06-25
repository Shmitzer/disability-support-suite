"use client";

import { useEffect, useId, useState } from "react";

export type CairaMood =
  | "idle"
  | "thinking"
  | "waving"
  | "excited"
  | "listening"
  | "sleeping"
  | "error";

const BODY_ANIM: Record<CairaMood, string> = {
  idle: "floatBob 3.2s ease-in-out infinite",
  thinking: "thinkNod 1.5s ease-in-out infinite",
  waving: "excitedBounce 0.55s ease-in-out 3",
  excited: "excitedBounce 0.4s ease-in-out infinite",
  listening: "floatBob 0.85s ease-in-out infinite",
  sleeping: "sleepDrift 4.2s ease-in-out infinite",
  error: "errorShake 0.5s ease-in-out 4",
};

/**
 * CairaFull — the complete clay-molded character with mood-driven
 * pose, face and animation.
 */
export default function CairaFull({
  mood,
  size = 100,
}: {
  mood: CairaMood;
  size?: number;
}) {
  const [blink, setBlink] = useState(false);

  // Gradient ids are SVG-scoped — make them unique per instance.
  const uid = useId().replace(/:/g, "");
  const fg = `fg-${uid}`;
  const fgd = `fgd-${uid}`;

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      const t = setTimeout(() => setBlink(false), 110);
      return () => clearTimeout(t);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const showDots = mood === "thinking" || mood === "listening";

  return (
    <div style={{ filter: "drop-shadow(0 8px 20px rgba(90,65,55,0.22))" }}>
      <svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 100 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: BODY_ANIM[mood], transformOrigin: "50% 70%" }}
      >
        <defs>
          <radialGradient id={fg} cx="38%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#fef9f5" />
            <stop offset="55%" stopColor="#f5ebe2" />
            <stop offset="100%" stopColor="#ecddd4" />
          </radialGradient>
          <radialGradient id={fgd} cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#f5ebe2" />
            <stop offset="100%" stopColor="#e5d5ca" />
          </radialGradient>
        </defs>

        {/* 1. Ground shadow */}
        <ellipse cx="50" cy="137" rx="25" ry="4.5" fill="#b89e94" opacity={0.18} />

        {/* 2-3. Feet */}
        <ellipse cx="40" cy="124" rx="14" ry="9" fill={`url(#${fgd})`} />
        <ellipse cx="61" cy="124" rx="14" ry="9" fill={`url(#${fgd})`} />

        {/* 4. Torso */}
        <ellipse cx="50" cy="90" rx="27" ry="38" fill={`url(#${fg})`} />

        {/* 5. Left arm */}
        <ellipse cx="21" cy="84" rx="10" ry="18" transform="rotate(18 21 84)" fill={`url(#${fg})`} />

        {/* 6. Neck connector */}
        <rect x="36" y="62" width="28" height="20" rx="9" fill={`url(#${fg})`} />

        {/* 7. Head */}
        <circle cx="50" cy="40" r="29" fill={`url(#${fg})`} />

        {/* 8. Right arm (raised) */}
        <g className={mood === "waving" ? "arm-wave" : undefined}>
          <ellipse cx="79" cy="57" rx="10" ry="21" transform="rotate(-36 79 57)" fill={`url(#${fg})`} />
        </g>

        {/* 9. Pink clay swirl */}
        <path
          d="M41 13 Q35 28 39 43 Q42 56 37 70 Q33 82 38 98"
          stroke="#e8aaa2"
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          opacity={0.27}
        />
        {/* 10. Teal clay swirl */}
        <path
          d="M61 11 Q67 26 62 41 Q58 56 65 72 Q69 84 63 99"
          stroke="#6bc4bc"
          strokeWidth={6.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />
        {/* 11. Secondary pink wisp */}
        <path
          d="M55 14 Q60 24 57 36"
          stroke="#e8aaa2"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.18}
        />

        {/* 12. Pink blush */}
        <circle cx="38" cy="22" r="14" fill="#e8aaa2" opacity={0.08} />

        {/* 13-14. Teal heart */}
        <path
          d="M50 100 C50 100 40 91 40 86 C40 82 43.5 79 47 79 C48.5 79 50 81 50 81 C50 81 51.5 79 53 79 C56.5 79 60 82 60 86 C60 91 50 100 50 100 Z"
          fill="#4db8b0"
          fillOpacity={0.2}
          stroke="#4db8b0"
          strokeWidth={1.6}
        />
        <path
          d="M50 96 C50 96 43.5 90 43.5 86.5 C43.5 84 45.7 82 48 82 C49 82 50 83.2 50 83.2 C50 83.2 51 82 52 82 C54.3 82 56.5 84 56.5 86.5 C56.5 90 50 96 50 96 Z"
          fill="none"
          stroke="#4db8b0"
          strokeWidth={1}
          opacity={0.55}
        />

        {/* 15-16. Antenna */}
        <line x1="50" y1="11" x2="50" y2="19" stroke="#4db8b0" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="50" cy="10" r="4" fill="#4db8b0">
          <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* 17. Thinking dots */}
        {showDots && (
          <>
            <circle cx="36" cy="17" r="2.8" fill="#4db8b0">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="12" r="2.8" fill="#4db8b0">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="64" cy="17" r="2.8" fill="#4db8b0">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* 18. Eyes */}
        <Eyes mood={mood} blink={blink} />

        {/* 19. Mouth */}
        <Mouth mood={mood} />

        {/* 20. Sleeping ZZZs */}
        {mood === "sleeping" && (
          <>
            <text x="66" y="30" fontSize="9" fill="#4db8b0" fontWeight={700} style={{ animation: "zzz 2.6s ease-out infinite", animationDelay: "0s" }}>z</text>
            <text x="72" y="22" fontSize="11" fill="#4db8b0" fontWeight={700} style={{ animation: "zzz 2.6s ease-out infinite", animationDelay: "0.9s" }}>z</text>
            <text x="78" y="14" fontSize="13" fill="#4db8b0" fontWeight={700} style={{ animation: "zzz 2.6s ease-out infinite", animationDelay: "1.8s" }}>Z</text>
          </>
        )}

        {/* 21. Excited sparkles */}
        {mood === "excited" && (
          <>
            <text x="20" y="34" fontSize="12" style={{ animation: "floatBob 1.6s ease-in-out infinite", animationDelay: "0s" }}>✨</text>
            <text x="74" y="40" fontSize="12" style={{ animation: "floatBob 1.6s ease-in-out infinite", animationDelay: "0.6s" }}>✨</text>
          </>
        )}
      </svg>
    </div>
  );
}

function Eyes({ mood, blink }: { mood: CairaMood; blink: boolean }) {
  if (mood === "sleeping") {
    return (
      <>
        <path d="M36 42 Q41 46 46 42" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <path d="M54 42 Q59 46 64 42" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (mood === "error") {
    return (
      <>
        <line x1="37" y1="39" x2="44" y2="46" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" />
        <line x1="44" y1="39" x2="37" y2="46" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" />
        <line x1="56" y1="39" x2="63" y2="46" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" />
        <line x1="63" y1="39" x2="56" y2="46" stroke="#7a6355" strokeWidth={2.2} strokeLinecap="round" />
      </>
    );
  }
  if (mood === "thinking" || mood === "listening") {
    const ry = blink ? 0.6 : 3.6;
    return (
      <>
        <ellipse cx="41" cy="42" rx="3.6" ry={ry} fill="#7a6355" />
        <ellipse cx="59" cy="42" rx="3.6" ry={ry} fill="#7a6355" />
      </>
    );
  }
  const ry = blink ? 0.6 : 4.2;
  return (
    <>
      <ellipse cx="41" cy="42" rx="3.6" ry={ry} fill="#7a6355" />
      <ellipse cx="59" cy="42" rx="3.6" ry={ry} fill="#7a6355" />
      {!blink && (
        <>
          <circle cx="42.4" cy="40.4" r="1.2" fill="#fff" />
          <circle cx="60.4" cy="40.4" r="1.2" fill="#fff" />
        </>
      )}
    </>
  );
}

function Mouth({ mood }: { mood: CairaMood }) {
  if (mood === "sleeping") {
    return <ellipse cx="50" cy="53" rx="3" ry="4" fill="#7a6355" opacity={0.35} />;
  }
  if (mood === "error") {
    return <path d="M43 56 Q50 50 57 56" stroke="#7a6355" strokeWidth={2.4} strokeLinecap="round" fill="none" />;
  }
  if (mood === "thinking") {
    return <rect x="44" y="52" width="12" height="2.4" rx="1.2" fill="#7a6355" />;
  }
  if (mood === "excited" || mood === "waving") {
    return (
      <path
        d="M42 51 Q50 61 58 51 Q50 56 42 51 Z"
        stroke="#7a6355"
        strokeWidth={2.2}
        strokeLinejoin="round"
        fill="#e8aaa2"
        fillOpacity={0.45}
      />
    );
  }
  return <path d="M43 52 Q50 58 57 52" stroke="#7a6355" strokeWidth={2.4} strokeLinecap="round" fill="none" />;
}
