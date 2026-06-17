// ReportPanel.tsx — the "generate / view the AI report" box on the shift page.
//
// Client component, because generating takes a few seconds and we want a proper
// "Generating…" state and a friendly error if it fails. It uses useActionState
// (React 19): the form calls the server action, and we get back { error } plus a
// pending flag while it runs. On success the page revalidates and the saved
// summary appears (passed in as `summary`).
//
// "Copy" puts the summary on the clipboard so the worker can paste it into their
// official system.

"use client";

import { useActionState, useState } from "react";
import { generateReport, type ReportState } from "@/lib/report-actions";

export function ReportPanel({
  shiftId,
  summary,
  generatedAt,
}: {
  shiftId: string;
  summary: string | null; // the saved summary, or null if none yet
  generatedAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(
    generateReport,
    {},
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Progress report</h2>
        {summary && <CopyButton text={summary} />}
      </div>

      {summary ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{summary}</p>
          {generatedAt && (
            <p className="text-xs text-zinc-400">Generated {formatStamp(generatedAt)}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Create a person-centred summary of this shift from everything you logged.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="shiftId" value={shiftId} />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending
            ? "Generating…"
            : summary
              ? "Regenerate report"
              : "Generate report"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </section>
  );
}

// A tiny copy-to-clipboard button with a brief "Copied" confirmation.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function formatStamp(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
