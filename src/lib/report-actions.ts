// report-actions.ts — the end-shift AI report (1g) + the approval flow (1i).
//
// One ShiftReport row per shift, evolved in place:
//   • generateReport      — write/refresh the draft summary from the shift log.
//   • requestClarifications — ask the AI what observable details are missing.
//   • applyAnswers        — fold the worker's confirmed answers in and regenerate.
//   • saveSummary         — save the worker's own hand-edits.
//   • approveReport / reopenReport — lock / unlock the final note.
//
// House rules (as everywhere): re-check the caller, only their own shift, only when
// it makes sense (the shift is COMPLETED). The clarifying step is what keeps us
// honest: the AI surfaces gaps, but the WORKER supplies the observed facts.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { buildShiftSourceLog } from "@/lib/report";
import {
  generateShiftReport,
  generateClarifyingQuestions,
  currentModelName,
  type Clarification,
} from "@/lib/ai";
import { revalidatePath } from "next/cache";

// The shape useActionState expects back: an optional error / info message.
export type ReportState = { error?: string; info?: string };

// --- Shared helpers ---------------------------------------------------------

// Load a shift the current worker is allowed to write a report for, plus its
// single (latest) report row if one exists. Returns null on any failure.
async function loadOwnCompletedShift(shiftId: string) {
  const worker = await getCurrentWorker();
  if (!worker || !shiftId) return null;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      participant: true,
      allocatedTo: true,
      entries: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "COMPLETED") return null;
  return shift;
}

// The people whose names appear in this shift's log — handed to the AI layer so
// they can be scrubbed before any text is sent to the model (Rule 2).
function peopleIn(shift: {
  participant: { name: string };
  allocatedTo: { name: string } | null;
}): string[] {
  return [shift.participant.name, shift.allocatedTo?.name].filter(
    (n): n is string => !!n,
  );
}

function parseClarifications(json: string | null): Clarification[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseQuestions(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string") : [];
  } catch {
    return [];
  }
}

// --- 1g: generate / regenerate the draft from scratch -----------------------

export async function generateReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const shiftId = String(formData.get("shiftId") ?? "");
  const shift = await loadOwnCompletedShift(shiftId);
  if (!shift) return { error: "Finish the shift (clock off) before generating its report." };

  const sourceLog = buildShiftSourceLog(shift);

  let summary: string;
  try {
    summary = await generateShiftReport(sourceLog, [], peopleIn(shift));
  } catch (err) {
    console.error("generateReport failed:", err);
    return { error: "The AI couldn't write the report just now. Please try again." };
  }

  const existing = shift.reports[0];
  const data = {
    summary,
    sourceLog,
    model: currentModelName(),
    status: "DRAFT",
    questions: null,
    clarifications: null,
    approvedAt: null,
  };

  // One report per shift: refresh it in place, or create the first one.
  if (existing) {
    await prisma.shiftReport.update({ where: { id: existing.id }, data });
  } else {
    await prisma.shiftReport.create({ data: { shiftId, ...data } });
  }

  revalidatePath(`/shift/${shiftId}`);
  return {};
}

// --- 1i: ask the AI for clarifying questions --------------------------------

export async function requestClarifications(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const shiftId = String(formData.get("shiftId") ?? "");
  const shift = await loadOwnCompletedShift(shiftId);
  const report = shift?.reports[0];
  if (!shift || !report) return { error: "Generate the report first." };

  let questions: string[];
  try {
    questions = await generateClarifyingQuestions(report.sourceLog, report.summary, peopleIn(shift));
  } catch (err) {
    console.error("requestClarifications failed:", err);
    return { error: "Couldn't fetch questions just now. Please try again." };
  }

  await prisma.shiftReport.update({
    where: { id: report.id },
    data: { questions: JSON.stringify(questions) },
  });

  revalidatePath(`/shift/${shiftId}`);
  return questions.length === 0
    ? { info: "The AI didn't find anything else worth asking — the note looks complete." }
    : {};
}

// --- 1i: fold the worker's confirmed answers in and regenerate --------------

export async function applyAnswers(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const shiftId = String(formData.get("shiftId") ?? "");
  const shift = await loadOwnCompletedShift(shiftId);
  const report = shift?.reports[0];
  if (!shift || !report) return { error: "Generate the report first." };

  // Pair each asked question with the worker's answer; drop the blanks.
  const questionList = parseQuestions(report.questions);
  const newAnswers: Clarification[] = [];
  questionList.forEach((q, i) => {
    const a = String(formData.get(`answer-${i}`) ?? "").trim();
    if (a) newAnswers.push({ q, a });
  });

  if (newAnswers.length === 0) {
    return { info: "No answers entered — nothing to add yet." };
  }

  // Combine with anything confirmed earlier, then regenerate from the log + all answers.
  const merged = [...parseClarifications(report.clarifications), ...newAnswers];

  let summary: string;
  try {
    summary = await generateShiftReport(report.sourceLog, merged, peopleIn(shift));
  } catch (err) {
    console.error("applyAnswers failed:", err);
    return { error: "The AI couldn't update the report just now. Please try again." };
  }

  await prisma.shiftReport.update({
    where: { id: report.id },
    data: {
      summary,
      clarifications: JSON.stringify(merged),
      questions: null, // answered — clear the prompt list
      status: "DRAFT",
    },
  });

  revalidatePath(`/shift/${shiftId}`);
  return {};
}

// --- 1i: save the worker's own hand-edits to the summary --------------------

export async function saveSummary(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const edited = String(formData.get("summary") ?? "").trim();
  const shift = await loadOwnCompletedShift(shiftId);
  const report = shift?.reports[0];
  if (!shift || !report || !edited) return;

  await prisma.shiftReport.update({
    where: { id: report.id },
    data: { summary: edited },
  });

  revalidatePath(`/shift/${shiftId}`);
}

// --- 1i: approve (lock) / reopen the report ---------------------------------

export async function approveReport(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const shift = await loadOwnCompletedShift(shiftId);
  const report = shift?.reports[0];
  if (!shift || !report) return;

  await prisma.shiftReport.update({
    where: { id: report.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  revalidatePath(`/shift/${shiftId}`);
}

export async function reopenReport(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const shift = await loadOwnCompletedShift(shiftId);
  const report = shift?.reports[0];
  if (!shift || !report) return;

  await prisma.shiftReport.update({
    where: { id: report.id },
    data: { status: "DRAFT", approvedAt: null },
  });

  revalidatePath(`/shift/${shiftId}`);
}
