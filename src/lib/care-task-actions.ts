// care-task-actions.ts — #1 task/ADL checklist. The plan of tasks for a participant
// (managed by a coordinator) + per-shift completions (ticked by the worker on shift).
// LOGIC ONLY — cd renders the checklist + manage UI.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export type ChecklistItem = {
  careTaskId: string;
  title: string;
  category: string | null;
  status: "DONE" | "SKIPPED" | null; // null = not yet actioned this shift
  note: string | null;
};

// --- Plan management (coordinator) ---
export async function addCareTask(input: {
  participantId: string;
  title: string;
  category?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const participant = await prisma.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: participant.organisationId })) {
    return { ok: false, error: "You don't have permission to edit this plan." };
  }
  if (!input.title.trim()) return { ok: false, error: "A task title is required." };
  try {
    const t = await prisma.careTask.create({
      data: {
        participantId: participant.id,
        organisationId: participant.organisationId,
        title: input.title.trim(),
        category: input.category ?? null,
        createdById: worker.id,
      },
    });
    revalidatePath(`/participants/${participant.id}`);
    return { ok: true, id: t.id };
  } catch (err) {
    console.error("addCareTask failed:", err);
    return { ok: false, error: "Couldn't add the task — the table may not be set up yet." };
  }
}

export async function archiveCareTask(careTaskId: string): Promise<{ ok: boolean; error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const task = await prisma.careTask.findUnique({
    where: { id: careTaskId },
    select: { id: true, participantId: true, organisationId: true },
  });
  if (!task) return { ok: false, error: "Task not found." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CareProfileManage, { organisationId: task.organisationId })) {
    return { ok: false, error: "You don't have permission to edit this plan." };
  }
  await prisma.careTask.update({ where: { id: careTaskId }, data: { active: false } });
  revalidatePath(`/participants/${task.participantId}`);
  return { ok: true };
}

// --- On-shift checklist (worker) ---
// The participant's active tasks merged with this shift's completions.
export async function getShiftChecklist(shiftId: string): Promise<ChecklistItem[]> {
  const worker = await getCurrentWorker();
  if (!worker || !shiftId) return [];
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true, participantId: true, allocatedToId: true },
  });
  if (!shift) return [];
  // Visible to the allocated worker or org oversight.
  const principal = await getCurrentPrincipal();
  const isOwn = shift.allocatedToId === worker.id;
  if (!isOwn && !(principal && can(principal, Capability.ShiftReadOrg, {}))) return [];

  let tasks: { id: string; title: string; category: string | null }[] = [];
  let done: { careTaskId: string; status: string; note: string | null }[] = [];
  try {
    tasks = await prisma.careTask.findMany({
      where: { participantId: shift.participantId, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, category: true },
    });
    // tenant-ok: `shift` was authorized above (own shift or org oversight); the
    // completions are keyed by that single authorized shiftId.
    done = await prisma.shiftTaskCompletion.findMany({
      where: { shiftId },
      select: { careTaskId: true, status: true, note: true },
    });
  } catch {
    return [];
  }
  const byTask = new Map(done.map((d) => [d.careTaskId, d]));
  return tasks.map((t) => {
    const d = byTask.get(t.id);
    return {
      careTaskId: t.id,
      title: t.title,
      category: t.category,
      status: (d?.status as "DONE" | "SKIPPED" | undefined) ?? null,
      note: d?.note ?? null,
    };
  });
}

// Tick / untick a task for the current shift (worker, own active shift).
export async function setTaskCompletion(input: {
  shiftId: string;
  careTaskId: string;
  status: "DONE" | "SKIPPED" | null; // null clears it
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    select: { id: true, allocatedToId: true, status: true, organisationId: true, participantId: true },
  });
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "IN_PROGRESS") {
    return { ok: false, error: "This isn't an active shift you can log to." };
  }
  // The client-supplied careTaskId must belong to this shift's participant — otherwise
  // a foreign task id could be written into this shift's completion record.
  const careTask = await prisma.careTask.findUnique({
    where: { id: input.careTaskId },
    select: { participantId: true },
  });
  if (!careTask || careTask.participantId !== shift.participantId) {
    return { ok: false, error: "That task isn't for this participant." };
  }
  try {
    if (input.status === null) {
      // tenant-ok: shift was just authorized as the worker's own IN_PROGRESS shift.
      await prisma.shiftTaskCompletion.deleteMany({
        where: { shiftId: input.shiftId, careTaskId: input.careTaskId },
      });
    } else {
      await prisma.shiftTaskCompletion.upsert({
        where: { shiftId_careTaskId: { shiftId: input.shiftId, careTaskId: input.careTaskId } },
        create: {
          shiftId: input.shiftId,
          careTaskId: input.careTaskId,
          status: input.status,
          note: input.note ?? null,
          completedById: worker.id,
          organisationId: shift.organisationId,
        },
        update: { status: input.status, note: input.note ?? null, completedById: worker.id },
      });
    }
    revalidatePath(`/shift/${input.shiftId}`);
    return { ok: true };
  } catch (err) {
    console.error("setTaskCompletion failed:", err);
    return { ok: false, error: "Couldn't save — the table may not be set up yet." };
  }
}
