"use client";

import CairaFull from "./CairaFull";
import { useCaira } from "./CairaContext";

/** CairaLoading — thinking-state loading placeholder (plain text when Caira is off). */
export default function CairaLoading({
  size,
  label = "One moment…",
}: {
  size?: number;
  label?: string;
}) {
  const { enabled } = useCaira();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      {enabled && <CairaFull mood="thinking" size={size ?? 72} />}
      {label && <p className="mt-2 text-xs text-caira-soft">{label}</p>}
    </div>
  );
}
