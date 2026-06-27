// report.ts — builds the "source log": the plain-text record of a shift that we
// feed to the AI (and save as the reusable hidden log on ShiftReport).
//
// This is deliberately deterministic code, not AI: the participant, the times,
// and every logged event are facts we already hold, so we lay them out exactly.
// The AI's job is only to summarise this — it never invents the facts.

import { findCategory } from "@/lib/log-categories";

// The minimum shape this needs from a shift (kept loose so the caller can pass a
// Prisma shift with its participant, allocated worker, and entries included).
type ShiftForLog = {
  participant: { name: string };
  allocatedTo: { name: string } | null;
  location: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  clockOnAt: Date | null;
  clockOffAt: Date | null;
  entries: { category: string; detail: string | null; notes: string; timestamp: Date }[];
};

export function buildShiftSourceLog(shift: ShiftForLog): string {
  const lines: string[] = [];

  lines.push(`Participant: ${shift.participant.name}`);
  if (shift.allocatedTo) lines.push(`Support worker: DSW ${shift.allocatedTo.name}`);
  lines.push(`Date: ${formatDate(shift.scheduledStart)}`);
  lines.push(`Scheduled time: ${formatTime(shift.scheduledStart)} – ${formatTime(shift.scheduledEnd)}`);
  if (shift.location) lines.push(`Location: ${shift.location}`);
  if (shift.clockOnAt) lines.push(`Clocked on: ${formatTime(shift.clockOnAt)}`);
  if (shift.clockOffAt) lines.push(`Clocked off: ${formatTime(shift.clockOffAt)}`);

  lines.push("");
  lines.push("Log entries (recorded time — category — details — worker's note):");

  if (shift.entries.length === 0) {
    lines.push("(No entries were logged during this shift.)");
  } else {
    // Oldest first, so the log reads start-to-finish.
    const ordered = [...shift.entries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    for (const e of ordered) {
      // category (its display label), then the structured detail, then the note.
      const label = findCategory(e.category)?.label ?? e.category;
      const cat = e.detail ? `${label} (${e.detail})` : label;
      const note = e.notes.trim() || "(no note)";
      lines.push(`${formatTime(e.timestamp)} — ${cat} — ${note}`);
    }
  }

  return lines.join("\n");
}

// --- en-AU formatting, matching the rest of the app ------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
