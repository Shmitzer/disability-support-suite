// clock-actions.ts — the clock on/off loop and the clock-time amendment flow.
//
// Two sides live here:
//   • Worker actions  — clockOn, clockOff, requestAmendment.
//   • Manager actions — approveAmendment, rejectAmendment.
//
// The rules of task 1e:
//   1. A worker can clock on from 10 minutes before the scheduled start.
//   2. Clocking off completes the shift.
//   3. Workers can NEVER edit a clock time directly. Asking to fix one creates a
//      ClockAmendmentRequest that a manager approves or rejects.
//   4. Every action appends one line to the ShiftEvent audit log.
//
// Like the other *-actions files, each function re-checks who the caller is and
// what they're allowed to do — a form on the page is never trusted on its own.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner, tenantScope } from "@/lib/tenant";
import { can, Capability } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// How early a worker may clock on, in minutes before the scheduled start.
const CLOCK_ON_WINDOW_MINUTES = 10;

// ---------------------------------------------------------------------------
// Worker: clock on
// ---------------------------------------------------------------------------

// Clock on to an allocated shift. Only allowed from 10 minutes before the start.
// Moves the shift ALLOCATED -> IN_PROGRESS and stamps clockOnAt = now.
export async function clockOn(formData: FormData) {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!worker || !shiftId) return;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // Must be this worker's own shift, and still waiting to be started.
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "ALLOCATED") return;

  // Enforce the 10-minute window on the server too (the button is the courtesy;
  // this is the rule). new Date() is "now" on the server.
  const now = new Date();
  const opensAt = new Date(shift.scheduledStart.getTime() - CLOCK_ON_WINDOW_MINUTES * 60_000);
  if (now < opensAt) return; // too early

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "IN_PROGRESS",
      clockOnAt: now,
      events: { create: { type: "CLOCK_ON", actorId: worker.id, ...tenantOwner(worker) } },
    },
  });

  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Worker: clock off
// ---------------------------------------------------------------------------

// Clock off an in-progress shift. Stamps clockOffAt = now and completes it.
export async function clockOff(formData: FormData) {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!worker || !shiftId) return;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "IN_PROGRESS") return;

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: "COMPLETED",
      clockOffAt: new Date(),
      events: { create: { type: "CLOCK_OFF", actorId: worker.id, ...tenantOwner(worker) } },
    },
  });

  revalidatePath("/");
  revalidatePath(`/shift/${shiftId}`); // so the shift page can show the report step
}

// ---------------------------------------------------------------------------
// Worker: request a clock-time amendment (the only way to change a clock time)
// ---------------------------------------------------------------------------

// Ask a manager to set or fix one clock time. Creates a PENDING request and an
// AMEND_REQUESTED audit event. Nothing on the shift itself changes yet.
export async function requestAmendment(formData: FormData) {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!worker || !shiftId) return;
  // Only the two clock fields can be amended.
  if (field !== "clockOnAt" && field !== "clockOffAt") return;

  const proposedValue = new Date(value);
  if (Number.isNaN(proposedValue.getTime())) return; // bad/empty date

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // You can only request changes to your own shift.
  if (!shift || shift.allocatedToId !== worker.id) return;

  await prisma.clockAmendmentRequest.create({
    data: { shiftId, requestedById: worker.id, field, proposedValue, reason, ...tenantOwner(worker) },
  });

  await prisma.shiftEvent.create({
    data: {
      shiftId,
      type: "AMEND_REQUESTED",
      actorId: worker.id,
      detail: `Requested ${labelFor(field)} = ${formatStamp(proposedValue)}`,
      ...tenantOwner(worker),
    },
  });

  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Manager: approve / reject an amendment
// ---------------------------------------------------------------------------

// Approve a pending request: write the proposed time onto the shift, mark the
// request APPROVED, and log AMEND_APPROVED.
export async function approveAmendment(formData: FormData) {
  const manager = await getCurrentWorker();
  if (!manager || !can(manager.role, Capability.ClockAmend)) return; // approvers only
  const amendmentId = String(formData.get("amendmentId") ?? "");
  if (!amendmentId) return;

  const req = await prisma.clockAmendmentRequest.findFirst({
    where: { id: amendmentId, ...tenantScope(manager) },
  });
  if (!req || req.status !== "PENDING") return;

  // Build the single field to write (typed, rather than a dynamic key).
  const shiftData =
    req.field === "clockOnAt"
      ? { clockOnAt: req.proposedValue }
      : { clockOffAt: req.proposedValue };

  // Do all three writes together so they succeed or fail as one.
  await prisma.$transaction([
    prisma.shift.update({ where: { id: req.shiftId }, data: shiftData }),
    prisma.clockAmendmentRequest.update({
      where: { id: amendmentId },
      data: { status: "APPROVED", decidedById: manager.id, decidedAt: new Date() },
    }),
    prisma.shiftEvent.create({
      data: {
        shiftId: req.shiftId,
        type: "AMEND_APPROVED",
        actorId: manager.id,
        detail: `Approved ${labelFor(req.field)} = ${formatStamp(req.proposedValue)}`,
        ...tenantOwner(manager),
      },
    }),
  ]);

  revalidatePath("/");
}

// Reject a pending request: leave the shift untouched, mark REJECTED, log it.
export async function rejectAmendment(formData: FormData) {
  const manager = await getCurrentWorker();
  if (!manager || !can(manager.role, Capability.ClockAmend)) return;
  const amendmentId = String(formData.get("amendmentId") ?? "");
  if (!amendmentId) return;

  const req = await prisma.clockAmendmentRequest.findFirst({
    where: { id: amendmentId, ...tenantScope(manager) },
  });
  if (!req || req.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.clockAmendmentRequest.update({
      where: { id: amendmentId },
      data: { status: "REJECTED", decidedById: manager.id, decidedAt: new Date() },
    }),
    prisma.shiftEvent.create({
      data: {
        shiftId: req.shiftId,
        type: "AMEND_REJECTED",
        actorId: manager.id,
        detail: `Rejected ${labelFor(req.field)} request`,
        ...tenantOwner(manager),
      },
    }),
  ]);

  revalidatePath("/");
}

// --- Small helpers ---------------------------------------------------------

function labelFor(field: string): string {
  return field === "clockOnAt" ? "clock-on" : "clock-off";
}

function formatStamp(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
