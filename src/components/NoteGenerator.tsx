"use client";

// This component runs in the browser. It lets a support worker pick a participant,
// type rough notes, and get back a clean AI-generated progress note.

import { useState } from "react";
import { useRouter } from "next/navigation";

type Participant = { id: string; name: string };

export function NoteGenerator({ participants }: { participants: Participant[] }) {
  const router = useRouter();

  const [participantId, setParticipantId] = useState(participants[0]?.id ?? "");
  const [rawNotes, setRawNotes] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError("");
    setResult("");
    setCopied(false);

    if (!participantId) {
      setError("Please choose a participant.");
      return;
    }
    if (!rawNotes.trim()) {
      setError("Please type some notes first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, rawNotes }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      setResult(data.generatedNote);
      router.refresh(); // updates the "recent notes" list on the page
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="participant" className="text-sm font-medium text-zinc-700">
          Participant
        </label>
        <select
          id="participant"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rawNotes" className="text-sm font-medium text-zinc-700">
          Rough shift notes
        </label>
        <textarea
          id="rawNotes"
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          rows={8}
          placeholder="Jot down what happened during the shift — meals, mood, activities, any concerns. Don't worry about spelling or grammar."
          className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="self-start rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate progress note"}
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700">Generated progress note</h3>
            <button
              onClick={handleCopy}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
