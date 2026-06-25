"use client";

import CairaFull from "./CairaFull";
import { useCaira } from "./CairaContext";

/** CairaError — error-state placeholder with optional retry (plain when Caira is off). */
export default function CairaError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { enabled } = useCaira();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      {enabled && <CairaFull mood="error" size={72} />}
      <p className="text-center text-sm text-red-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-caira-teal underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
