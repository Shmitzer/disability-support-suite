// CopyButton.tsx — a small "copy this text to the clipboard" button, shared
// across the app (the report panel and the shift timeline both use it).
//
// Client component: the clipboard is a browser API, so this must run in the
// browser. It briefly flips its label to confirm the copy worked.

"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied ✓",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // The clipboard can be blocked (e.g. an insecure context). Fail quietly
          // rather than throwing — copying is a convenience, not critical.
        }
      }}
      className={
        className ??
        "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
