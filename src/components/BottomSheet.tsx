// BottomSheet.tsx — a slide-up panel for picking something one-handed on a phone.
//
// Shared by the amount picker and the drink picker (define once, use everywhere).
// It's just a dimmed full-screen backdrop + a panel pinned to the bottom that
// slides up on open. The caller supplies a title and the rows (as children).
//
// It's marked `sm:hidden`, so it only ever appears on small screens — on web the
// callers show a dropdown / chips instead and never open this.

"use client";

import { useEffect, useState } from "react";

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Start off-screen, then slide up on the next tick — a simple mount animation.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
    // Close on Escape, for keyboard / switch-access users.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop — tap outside to dismiss. */}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      {/* The panel. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col gap-1 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl transition-transform duration-200 ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-zinc-200" aria-hidden />
        <h3 className="px-1 pb-1 text-center text-base font-semibold text-zinc-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}
