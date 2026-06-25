"use client";

import CairaFull from "./CairaFull";

/** CairaError — error-state placeholder with optional retry. */
export default function CairaError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <CairaFull mood="error" size={72} />
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
