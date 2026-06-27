// ReportPanel.tsx — generate the report (1g) and review/approve it (1i).
//
// The approval flow is the heart of 1i: rather than guessing missing detail, the
// AI ASKS the worker questions; the worker answers from what they observed; those
// confirmed answers are folded back in and the summary is regenerated. The worker
// can also hand-edit the text, then Approve to lock it (or Reopen to edit again).
//
// Client component: generating/asking/improving are multi-second AI calls, so we
// use useActionState for proper pending + error states. The quick actions
// (save edits / approve / reopen) are plain server-action forms.

"use client";

import { useActionState } from "react";
import {
  generateReport,
  requestClarifications,
  applyAnswers,
  saveSummary,
  approveReport,
  reopenReport,
  type ReportState,
} from "@/lib/report-actions";
import { CopyButton } from "@/components/CopyButton";

type Clarification = { q: string; a: string };

export function ReportPanel({
  shiftId,
  summary,
  status,
  questions,
  clarifications,
  approvedAt,
  generatedAt,
  logText,
}: {
  shiftId: string;
  summary: string | null;
  status: string; // DRAFT | APPROVED
  questions: string[];
  clarifications: Clarification[];
  approvedAt: Date | null;
  generatedAt: Date | null;
  logText: string; // the whole shift as plain text, for "Copy note + log"
}) {
  const approved = status === "APPROVED";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Progress report</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {summary && <StatusPill approved={approved} />}
          {summary && <CopyButton text={summary} label="Copy note" />}
          {summary && (
            <CopyButton
              text={`PROGRESS NOTE\n\n${summary}\n\n\nSHIFT LOG\n\n${logText}`}
              label="Copy note + log"
            />
          )}
        </div>
      </div>

      {!summary ? (
        <FirstGenerate shiftId={shiftId} />
      ) : approved ? (
        <ApprovedView
          shiftId={shiftId}
          summary={summary}
          approvedAt={approvedAt}
          clarifications={clarifications}
        />
      ) : (
        <DraftView
          shiftId={shiftId}
          summary={summary}
          questions={questions}
          clarifications={clarifications}
          generatedAt={generatedAt}
        />
      )}
    </section>
  );
}

// --- No report yet ----------------------------------------------------------

function FirstGenerate({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(generateReport, {});
  return (
    <>
      <p className="text-sm text-zinc-500">
        Create a person-centred summary of this shift from everything you logged.
      </p>
      <form action={formAction}>
        <input type="hidden" name="shiftId" value={shiftId} />
        <SubmitButton pending={pending} idle="Generate report" busy="Generating…" />
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </form>
    </>
  );
}

// --- Draft: edit, ask clarifying questions, improve, approve ----------------

function DraftView({
  shiftId,
  summary,
  questions,
  clarifications,
  generatedAt,
}: {
  shiftId: string;
  summary: string;
  questions: string[];
  clarifications: Clarification[];
  generatedAt: Date | null;
}) {
  const [askState, askAction, asking] = useActionState<ReportState, FormData>(
    requestClarifications,
    {},
  );
  const [regenState, regenAction, regenerating] = useActionState<ReportState, FormData>(
    generateReport,
    {},
  );

  return (
    <div className="flex flex-col gap-4">
      {/* The editable summary. key=summary so it refreshes after AI changes it. */}
      <form action={saveSummary} className="flex flex-col gap-2">
        <input type="hidden" name="shiftId" value={shiftId} />
        <textarea
          key={summary}
          name="summary"
          defaultValue={summary}
          rows={Math.min(16, Math.max(6, summary.split("\n").length + 4))}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-800 focus:border-blue-400 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Save edits
          </button>
          {generatedAt && (
            <span className="text-xs text-zinc-400">Last generated {formatStamp(generatedAt)}</span>
          )}
        </div>
      </form>

      {clarifications.length > 0 && <ConfirmedDetails items={clarifications} />}

      {/* AI clarifying questions (1i). */}
      {questions.length > 0 ? (
        <AnswerForm shiftId={shiftId} questions={questions} />
      ) : (
        <form action={askAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <SubmitButton
            pending={asking}
            idle="Ask AI what's missing"
            busy="Thinking…"
            variant="secondary"
          />
          {askState.error && <p className="mt-2 text-sm text-red-600">{askState.error}</p>}
          {askState.info && <p className="mt-2 text-sm text-zinc-500">{askState.info}</p>}
        </form>
      )}

      {/* Bottom row: regenerate from scratch, or approve. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <form action={regenAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <SubmitButton
            pending={regenerating}
            idle="Regenerate from log"
            busy="Regenerating…"
            variant="secondary"
          />
        </form>
        <form action={approveReport}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
            Approve report
          </button>
        </form>
      </div>
      {regenState.error && <p className="text-sm text-red-600">{regenState.error}</p>}
    </div>
  );
}

// The answer form for the AI's clarifying questions.
function AnswerForm({ shiftId, questions }: { shiftId: string; questions: string[] }) {
  const [state, action, improving] = useActionState<ReportState, FormData>(applyAnswers, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
      <p className="text-sm font-medium text-zinc-700">
        A few questions that could strengthen the note — answer only what you actually observed:
      </p>
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-1">
          <label className="text-sm text-zinc-700">{q}</label>
          <input
            type="text"
            name={`answer-${i}`}
            placeholder="Your answer (leave blank to skip)"
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
      ))}
      <input type="hidden" name="shiftId" value={shiftId} />
      <SubmitButton pending={improving} idle="Add answers & improve" busy="Improving…" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.info && <p className="text-sm text-zinc-500">{state.info}</p>}
    </form>
  );
}

// --- Approved (locked) view -------------------------------------------------

function ApprovedView({
  shiftId,
  summary,
  approvedAt,
  clarifications,
}: {
  shiftId: string;
  summary: string;
  approvedAt: Date | null;
  clarifications: Clarification[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{summary}</p>
      {clarifications.length > 0 && <ConfirmedDetails items={clarifications} />}
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
        <span className="text-xs text-green-700">
          Approved{approvedAt ? ` ${formatStamp(approvedAt)}` : ""}
        </span>
        <form action={reopenReport}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
            Reopen to edit
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Small shared bits ------------------------------------------------------

// Shows the details the worker confirmed, so it's clear what was added by hand.
function ConfirmedDetails({ items }: { items: Clarification[] }) {
  return (
    <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-600">
        Details you confirmed ({items.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((c, i) => (
          <li key={i} className="text-sm">
            <span className="text-zinc-500">{c.q}</span>
            <br />
            <span className="text-zinc-800">{c.a}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function StatusPill({ approved }: { approved: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {approved ? "Approved" : "Draft"}
    </span>
  );
}

function SubmitButton({
  pending,
  idle,
  busy,
  variant = "primary",
}: {
  pending: boolean;
  idle: string;
  busy: string;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${styles}`}
    >
      {pending ? busy : idle}
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
