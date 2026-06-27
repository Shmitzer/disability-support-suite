"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useCaira } from "./CairaContext";

/**
 * CairaWanderController — positional behaviour layer.
 *
 * Wraps any children (typically <CairaCharacter>) in a container that:
 *   • Wanders organically within a safe zone using a smoothed random walk
 *     (exponential lerp toward a randomly chosen target, with a gentle
 *     sinusoidal drift so she curves rather than travelling in straight lines)
 *   • Dwells at each destination for a randomised pause (2–5s) before choosing
 *     the next target, weighted slightly toward centre to avoid wall-hugging
 *   • Reacts to CairaContext `mode === "record"`: travels to a nominated
 *     mic-adjacent target, returns on stop
 *   • Never teleports — on resize it lerps to the nearest in-bounds position
 *
 * Design note: the wander feels intentional, not random. She has somewhere to go.
 */

interface WanderControllerProps {
  children: ReactNode;
  /** Width of the character in px (used to compute safe-zone right edge). */
  charWidth?: number;
  /** Height of the character in px. */
  charHeight?: number;
  /**
   * Safe-zone padding as a fraction of the container dimension.
   * e.g. 0.08 = 8% inset on all sides.
   */
  padding?: number;
  /**
   * Position (0–1) of the mic-adjacent target when recording.
   * [x, y] as fractions of the container dimensions.
   */
  micTarget?: [number, number];
  className?: string;
  style?: CSSProperties;
}

/** Exponential lerp — smooth, frame-rate independent. */
function expLerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/** Clamp a value to [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Weighted random target: biased 60% toward the centre third of the range. */
function biasedRandom(min: number, max: number): number {
  const centre = (min + max) / 2;
  const spread = (max - min) / 2;
  // Mix uniform and Gaussian-ish: average two uniforms (triangular distribution)
  // shifted toward centre.
  const u1 = Math.random();
  const u2 = Math.random();
  const raw = centre + spread * (u1 + u2 - 1) * 0.7;
  return clamp(raw, min, max);
}

/** Gentle sinusoidal drift offset — gives a curved path feel. */
function driftOffset(t: number, amplitude = 3): number {
  return Math.sin(t * 0.003) * amplitude;
}

export default function CairaWanderController({
  children,
  charWidth = 38,
  charHeight = 46,
  padding = 0.08,
  micTarget = [0.75, 0.5],
  className,
  style,
}: WanderControllerProps) {
  const { mode } = useCaira();

  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 20, y: 50 }); // current position in px
  const targetRef = useRef({ x: 20, y: 50 }); // target position in px
  const rafRef = useRef<number>(0);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driftPhaseRef = useRef(Math.random() * 1000); // random drift start

  const [pos, setPos] = useState({ x: 20, y: 50 });

  // Compute safe zone bounds from container + char dimensions.
  const getSafeZone = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
    const { width, height } = el.getBoundingClientRect();
    const px = width * padding;
    const py = height * padding;
    return {
      xMin: px,
      xMax: width - charWidth - px,
      yMin: py,
      yMax: height - charHeight - py,
    };
  }, [charWidth, charHeight, padding]);

  const pickNewTarget = useCallback(() => {
    const zone = getSafeZone();
    if (zone.xMax <= zone.xMin || zone.yMax <= zone.yMin) return;
    targetRef.current = {
      x: biasedRandom(zone.xMin, zone.xMax),
      y: biasedRandom(zone.yMin, zone.yMax),
    };
  }, [getSafeZone]);

  const scheduleDwell = useCallback(() => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    const delay = 2000 + Math.random() * 3000; // 2–5s dwell
    dwellRef.current = setTimeout(() => {
      pickNewTarget();
    }, delay);
  }, [pickNewTarget]);

  // Animation loop.
  useEffect(() => {
    let frame = 0;
    const LERP_WANDER = 0.035; // ~60fps → gentle drift
    const LERP_MIC = 0.065;    // faster travel to mic
    const ARRIVAL_THRESHOLD = 2; // px — "close enough"

    const tick = () => {
      frame++;
      driftPhaseRef.current++;
      const isRecording = mode === "recording";
      const lerpFactor = isRecording ? LERP_MIC : LERP_WANDER;

      const cur = posRef.current;
      const tgt = targetRef.current;
      const drift = driftOffset(driftPhaseRef.current);

      const nx = expLerp(cur.x, tgt.x + (isRecording ? 0 : drift), lerpFactor);
      const ny = expLerp(cur.y, tgt.y, lerpFactor);

      const dx = Math.abs(nx - tgt.x);
      const dy = Math.abs(ny - tgt.y);

      posRef.current = { x: nx, y: ny };

      // Only trigger React re-render every 3 frames to keep paint cost low.
      if (frame % 3 === 0) {
        setPos({ x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
      }

      // Arrived?
      if (!isRecording && dx < ARRIVAL_THRESHOLD && dy < ARRIVAL_THRESHOLD) {
        scheduleDwell();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (dwellRef.current) clearTimeout(dwellRef.current);
    };
  }, [mode, scheduleDwell]);

  // When recording starts: override target to mic-adjacent position.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (mode === "recording") {
      const { width, height } = el.getBoundingClientRect();
      if (dwellRef.current) clearTimeout(dwellRef.current);
      targetRef.current = {
        x: clamp(micTarget[0] * width - charWidth / 2, 0, width - charWidth),
        y: clamp(micTarget[1] * height - charHeight / 2, 0, height - charHeight),
      };
    } else {
      // Return to wander: pick a new target from current position.
      pickNewTarget();
    }
  }, [mode, micTarget, charWidth, charHeight, pickNewTarget]);

  // Clamp on container resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const zone = getSafeZone();
      if (zone.xMax <= zone.xMin) return;
      // Gently push target in-bounds; current pos will lerp there naturally.
      targetRef.current = {
        x: clamp(targetRef.current.x, zone.xMin, zone.xMax),
        y: clamp(targetRef.current.y, zone.yMin, zone.yMax),
      };
      // Snap current pos in-bounds immediately (avoids lerping from outside the container).
      posRef.current = {
        x: clamp(posRef.current.x, zone.xMin, zone.xMax),
        y: clamp(posRef.current.y, zone.yMin, zone.yMax),
      };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [getSafeZone]);

  // Init: pick first target after mount.
  useEffect(() => {
    pickNewTarget();
  }, [pickNewTarget]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", ...style }}
    >
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          willChange: "transform",
          // GPU-composite the movement so it doesn't trigger layout.
          transform: "translateZ(0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
