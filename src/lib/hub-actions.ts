// hub-actions.ts — Participant Hub server actions (HUB_DATA_MODEL.md). The attendance
// layer above Shift: device trust, a participant-anchored session, N concurrent worker
// check-ins (3:1), PIN-gated attributed logging, and the consent-gated cross-org
// timeline. LOGIC ONLY — cd builds the hub screens.
//
// Invariants honoured throughout:
//   • Rule 9  — every state change is hash-chain audited (recordAudit).
//   • Rule 12 — every logged entry carries an idempotencyKey; a replay is a no-op.
//   • Rule 5  — new rows stamp userId + organisationId (the logging worker's org).
//   • Graceful degradation — if the hub tables aren't applied yet, actions return a
//     friendly error instead of throwing.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolvePrincipal } from "@/lib/access";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { publishHubPing } from "@/lib/hub-realtime";
import {
  routeCapacity,
  stampHubEntry,
  hashHubPin,
  verifyHubPin,
  isValidPin,
  isHubCapacity,
  HUB_TIMELINE_CAPABILITY,
  type HubCapacity,
} from "@/lib/hub";

export type HubResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const TABLE_MISSING = "The hub isn't set up on this database yet.";

// ── PIN: per-worker quick-unlock for shared-device attribution ────────────────────

// Set/replace the current worker's hub PIN (call while fully authenticated).
export async function setWorkerPin(pin: string): Promise<HubResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!isValidPin(pin)) return { ok: false, error: "PIN must be 4–8 digits." };
  try {
    await prisma.worker.update({
      where: { id: worker.id },
      data: { pinHash: hashHubPin(pin), pinSetAt: new Date() },
    });
    await recordAudit({
      action: "HUB_PIN_SET",
      targetType: "Worker",
      targetId: worker.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
    });
    return { ok: true };
  } catch (err) {
    console.error("setWorkerPin failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

// Verify a PIN for a specific worker (the attribution tap on the shared device).
async function assertPin(workerId: string, pin: string): Promise<boolean> {
  const w = await prisma.worker.findUnique({ where: { id: workerId }, select: { pinHash: true } });
  return verifyHubPin(pin, w?.pinHash);
}

// ── Device trust ──────────────────────────────────────────────────────────────────

export async function registerHubDevice(input: {
  label: string;
  participantId?: string | null;
}): Promise<HubResult<{ deviceId: string }>> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!input.label?.trim()) return { ok: false, error: "Name the device." };
  try {
    const device = await prisma.hubDevice.create({
      data: {
        label: input.label.trim(),
        participantId: input.participantId ?? null,
        status: "ACTIVE",
        lastSeenAt: new Date(),
        userId: worker.id,
        organisationId: worker.organisationId,
      },
    });
    await recordAudit({
      action: "HUB_DEVICE_REGISTERED",
      targetType: "HubDevice",
      targetId: device.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { participantId: input.participantId ?? null },
    });
    return { ok: true, deviceId: device.id };
  } catch (err) {
    console.error("registerHubDevice failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

export async function revokeHubDevice(deviceId: string): Promise<HubResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  try {
    await prisma.hubDevice.update({ where: { id: deviceId }, data: { status: "REVOKED" } });
    await recordAudit({
      action: "HUB_DEVICE_REVOKED",
      targetType: "HubDevice",
      targetId: deviceId,
      actorId: worker.id,
      organisationId: worker.organisationId,
    });
    return { ok: true };
  } catch (err) {
    console.error("revokeHubDevice failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

// ── Session lifecycle ─────────────────────────────────────────────────────────────

// Open (or reuse) the OPEN session for a participant. Participant-anchored, not device-
// bound: the shared iPad and each phone are concurrent clients of the same session.
export async function openHubSession(input: {
  participantId: string;
  deviceId?: string | null;
}): Promise<HubResult<{ sessionId: string; reused: boolean }>> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!input.participantId) return { ok: false, error: "Pick a participant." };
  try {
    const existing = await prisma.hubSession.findFirst({
      where: { participantId: input.participantId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    if (existing) return { ok: true, sessionId: existing.id, reused: true };

    const session = await prisma.hubSession.create({
      data: {
        participantId: input.participantId,
        deviceId: input.deviceId ?? null,
        status: "OPEN",
        userId: worker.id,
        organisationId: worker.organisationId,
      },
    });
    await recordAudit({
      action: "HUB_SESSION_OPENED",
      targetType: "HubSession",
      targetId: session.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { participantId: input.participantId },
    });
    await publishHubPing(input.participantId, "session");
    return { ok: true, sessionId: session.id, reused: false };
  } catch (err) {
    console.error("openHubSession failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

export async function closeHubSession(sessionId: string): Promise<HubResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  try {
    const session = await prisma.hubSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    // Check out anyone still attending.
    await prisma.hubCheckIn.updateMany({
      where: { hubSessionId: sessionId, checkedOutAt: null },
      data: { checkedOutAt: new Date() },
    });
    await recordAudit({
      action: "HUB_SESSION_CLOSED",
      targetType: "HubSession",
      targetId: sessionId,
      actorId: worker.id,
      organisationId: worker.organisationId,
    });
    await publishHubPing(session.participantId, "session");
    return { ok: true };
  } catch (err) {
    console.error("closeHubSession failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

// ── Check-in / out ────────────────────────────────────────────────────────────────

// Attend a session in a given capacity. PIN-gated: the worker confirms it's them. The
// AI may pre-select the likely worker, but this confirmation is always required
// (audit integrity — never AI-auto-committed).
export async function hubCheckIn(input: {
  hubSessionId: string;
  workerId: string;
  capacity: HubCapacity;
  pin: string;
  shiftId?: string | null;
  accessGrantId?: string | null;
}): Promise<HubResult<{ checkInId: string }>> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Not signed in." };
  if (!isHubCapacity(input.capacity)) return { ok: false, error: "Pick a capacity." };

  const routed = routeCapacity(input.capacity, {
    shiftId: input.shiftId,
    accessGrantId: input.accessGrantId,
  });
  if (!routed.ok) return { ok: false, error: routed.error };

  try {
    const session = await prisma.hubSession.findUnique({
      where: { id: input.hubSessionId },
      select: { id: true, status: true, participantId: true },
    });
    if (!session || session.status !== "OPEN") {
      return { ok: false, error: "That session isn't open." };
    }
    if (!(await assertPin(input.workerId, input.pin))) {
      return { ok: false, error: "Incorrect PIN." };
    }

    // The check-in (and its entries) are owned by the ATTENDEE's org for RLS.
    const attendee = await prisma.worker.findUnique({
      where: { id: input.workerId },
      select: { organisationId: true },
    });

    const checkIn = await prisma.hubCheckIn.create({
      data: {
        hubSessionId: input.hubSessionId,
        workerId: input.workerId,
        capacity: input.capacity,
        billable: routed.billable,
        shiftId: routed.shiftId,
        accessGrantId: routed.accessGrantId,
        userId: input.workerId,
        organisationId: attendee?.organisationId ?? null,
      },
    });
    await recordAudit({
      action: "HUB_CHECKED_IN",
      targetType: "Participant",
      targetId: session.participantId,
      actorId: input.workerId,
      organisationId: attendee?.organisationId ?? null,
      detail: { checkInId: checkIn.id, capacity: input.capacity, billable: routed.billable },
    });
    await publishHubPing(session.participantId, "checkin");
    return { ok: true, checkInId: checkIn.id };
  } catch (err) {
    console.error("hubCheckIn failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

export async function hubCheckOut(checkInId: string): Promise<HubResult> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Not signed in." };
  try {
    const checkIn = await prisma.hubCheckIn.update({
      where: { id: checkInId },
      data: { checkedOutAt: new Date() },
      select: { workerId: true, organisationId: true, hubSessionId: true },
    });
    const session = await prisma.hubSession.findUnique({
      where: { id: checkIn.hubSessionId },
      select: { participantId: true },
    });
    await recordAudit({
      action: "HUB_CHECKED_OUT",
      targetType: "HubCheckIn",
      targetId: checkInId,
      actorId: checkIn.workerId,
      organisationId: checkIn.organisationId,
    });
    if (session) await publishHubPing(session.participantId, "checkout");
    return { ok: true };
  } catch (err) {
    console.error("hubCheckOut failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

// ── Logging an entry through the hub ──────────────────────────────────────────────

// PIN-gated, idempotent, audited. Stamps loggedByWorkerId / actingCapacity /
// participantId / org from the check-in. A replay (same idempotencyKey, e.g. the same
// event arriving from the iPad and a phone) is a no-op returning the existing row.
export async function logHubEntry(input: {
  hubCheckInId: string;
  category: string;
  notes: string;
  detail?: string | null;
  idempotencyKey: string;
  pin: string;
  sourceDevice?: "TABLET" | "PHONE" | null;
  timestamp?: string | null;
}): Promise<HubResult<{ entryId: string; deduped: boolean }>> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Not signed in." };
  if (!input.category?.trim()) return { ok: false, error: "Pick a category." };
  if (!input.idempotencyKey) return { ok: false, error: "Missing idempotency key (Rule 12)." };

  try {
    // Idempotency first: a replay short-circuits before any PIN or write.
    const dupe = await prisma.logEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (dupe) return { ok: true, entryId: dupe.id, deduped: true };

    const checkIn = await prisma.hubCheckIn.findUnique({
      where: { id: input.hubCheckInId },
      select: {
        id: true,
        workerId: true,
        capacity: true,
        checkedOutAt: true,
        organisationId: true,
        hubSessionId: true,
      },
    });
    if (!checkIn) return { ok: false, error: "That check-in doesn't exist." };
    if (checkIn.checkedOutAt) return { ok: false, error: "That check-in is closed." };
    if (!isHubCapacity(checkIn.capacity)) return { ok: false, error: "Bad check-in capacity." };

    const session = await prisma.hubSession.findUnique({
      where: { id: checkIn.hubSessionId },
      select: { participantId: true, status: true },
    });
    if (!session || session.status !== "OPEN") return { ok: false, error: "That session isn't open." };

    if (!(await assertPin(checkIn.workerId, input.pin))) {
      return { ok: false, error: "Incorrect PIN." };
    }

    const stamp = stampHubEntry({
      hubCheckInId: checkIn.id,
      participantId: session.participantId,
      loggedByWorkerId: checkIn.workerId,
      actingCapacity: checkIn.capacity,
      ownerUserId: checkIn.workerId,
      ownerOrganisationId: checkIn.organisationId,
      sourceDevice: input.sourceDevice ?? null,
    });

    let entry;
    try {
      entry = await prisma.logEntry.create({
        data: {
          ...stamp,
          category: input.category.trim(),
          detail: input.detail ?? null,
          notes: input.notes ?? "",
          timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
          idempotencyKey: input.idempotencyKey,
        },
      });
    } catch (err: unknown) {
      // Unique-key race: two devices created the same entry simultaneously. Resolve
      // to the existing row — idempotent (Rule 12).
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        const won = await prisma.logEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true },
        });
        if (won) return { ok: true, entryId: won.id, deduped: true };
      }
      throw err;
    }

    await recordAudit({
      action: "HUB_ENTRY_LOGGED",
      targetType: "Participant",
      targetId: session.participantId,
      actorId: checkIn.workerId,
      organisationId: checkIn.organisationId,
      detail: { entryId: entry.id, category: entry.category, capacity: checkIn.capacity },
    });
    await publishHubPing(session.participantId, "entry");
    return { ok: true, entryId: entry.id, deduped: false };
  } catch (err) {
    console.error("logHubEntry failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}

// ── The consent-gated cross-org timeline ──────────────────────────────────────────

export type HubTimelineEntry = {
  id: string;
  category: string;
  detail: string | null;
  notes: string;
  timestamp: string;
  actingCapacity: string | null;
  loggedByWorkerId: string | null;
  organisationId: string | null;
};

// The unified timeline spans every org that has logged for this participant. Org-match
// RLS would (correctly) hide the other orgs' rows, so this read is authorised by an
// ACTIVE ParticipantAccessGrant (consent), not org-match, and reads across orgs via
// Prisma (which bypasses RLS — the existing Option-A pattern). Paginated by timestamp.
export async function participantHubTimeline(input: {
  participantId: string;
  before?: string | null; // ISO cursor (exclusive); returns entries strictly before it
  limit?: number;
}): Promise<HubResult<{ entries: HubTimelineEntry[]; nextCursor: string | null }>> {
  const viewer = await getCurrentUser();
  if (!viewer) return { ok: false, error: "Not signed in." };

  // Gate: the viewer must hold an active grant conferring NotesRead on THIS participant.
  const principal = await resolvePrincipal(viewer.id);
  const allowed = can(principal, HUB_TIMELINE_CAPABILITY, { participantId: input.participantId });
  if (!allowed) return { ok: false, error: "You don't have access to this participant's hub." };

  const take = Math.min(Math.max(input.limit ?? 50, 1), 200);
  try {
    // tenant-ok: participant-grant-authorised hub timeline — deliberate cross-org read
    // gated by the ACTIVE ParticipantAccessGrant resolved above (HUB_DATA_MODEL.md §RLS).
    const rows = await prisma.logEntry.findMany({
      where: {
        participantId: input.participantId,
        ...(input.before ? { timestamp: { lt: new Date(input.before) } } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: take + 1,
      select: {
        id: true,
        category: true,
        detail: true,
        notes: true,
        timestamp: true,
        actingCapacity: true,
        loggedByWorkerId: true,
        organisationId: true,
      },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      ok: true,
      entries: page.map((r) => ({
        id: r.id,
        category: r.category,
        detail: r.detail,
        notes: r.notes,
        timestamp: r.timestamp.toISOString(),
        actingCapacity: r.actingCapacity,
        loggedByWorkerId: r.loggedByWorkerId,
        organisationId: r.organisationId,
      })),
      nextCursor: hasMore ? page[page.length - 1].timestamp.toISOString() : null,
    };
  } catch (err) {
    console.error("participantHubTimeline failed:", err);
    return { ok: false, error: TABLE_MISSING };
  }
}
