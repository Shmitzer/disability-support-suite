// report-actions.ts — the "end shift → AI report" server action (task 1g).
//
// When a worker has finished a shift, this compiles the shift's log, asks Gemini
// for a warm summary (using the locked prompt in ai.ts), and saves BOTH the
// summary and the exact source log to a ShiftReport row.
//
// House rules, same as the other *-actions files: re-check the caller, only act on
// their own shift, only when it makes sense (the shift is COMPLETED).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { buildShiftSourceLog } from "@/lib/report";
import { generateShiftReport, currentModelName } from "@/lib/ai";
import { revalidatePath } from "next/cache";

// The shape useActionState expects back: an optional error message.
export type ReportState = { error?: string };

// Generate (or regenerate) the AI report for one completed shift.
// Used with useActionState, so it takes the previous state then the form data.
export async function generateReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!worker || !shiftId) return { error: "Something went wrong — please try again." };

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { participant: true, allocatedTo: true, entries: true },
  });

  // Only your own shift, and only once it's finished.
  if (!shift || shift.allocatedToId !== worker.id) {
    return { error: "You can only generate a report for your own shift." };
  }
  if (shift.status !== "COMPLETED") {
    return { error: "Finish the shift (clock off) before generating its report." };
  }

  // Compile the facts, then ask the AI to summarise them.
  const sourceLog = buildShiftSourceLog(shift);

  let summary: string;
  try {
    summary = await generateShiftReport(sourceLog);
  } catch (err) {
    // Surface a friendly message; the real error is logged on the server.
    console.error("generateReport failed:", err);
    return { error: "The AI couldn't write the report just now. Please try again." };
  }

  await prisma.shiftReport.create({
    data: { shiftId, summary, sourceLog, model: currentModelName() },
  });

  revalidatePath(`/shift/${shiftId}`);
  return {};
}
