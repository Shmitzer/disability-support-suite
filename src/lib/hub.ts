// hub.ts — Participant Hub pure core (HUB_DATA_MODEL.md). LOGIC ONLY, no DB / no
// "use server": the decision logic that hub-actions.ts wraps, kept pure so it's unit-
// testable (test/hub.test.ts) without a database. Covers capacity→funding routing,
// hub-entry stamping, server-side quick-unlock PIN hashing, RP reportable derivation,
// and the participant-keyed Realtime channel name.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Capability } from "@/lib/rbac";

// ── Capacity (who is logging, in what role) ───────────────────────────────────────
export type HubCapacity = "WORKER" | "FAMILY" | "GUARDIAN";
export const HUB_CAPACITIES: readonly HubCapacity[] = ["WORKER", "FAMILY", "GUARDIAN"] as const;

export function isHubCapacity(v: unknown): v is HubCapacity {
  return typeof v === "string" && (HUB_CAPACITIES as readonly string[]).includes(v);
}

// Capacity → funding routing (the crux of the attendance layer):
//   • WORKER  → billable, MUST carry a shiftId (links EVV/billing/SCHADS to the Shift)
//   • FAMILY/GUARDIAN → NOT billable, MUST carry an accessGrantId (the grant authorising
//     non-paid presence). No Shift, no billing.
export type CapacityLink = { shiftId?: string | null; accessGrantId?: string | null };
export type RouteResult =
  | { ok: true; billable: boolean; shiftId: string | null; accessGrantId: string | null }
  | { ok: false; error: string };

export function routeCapacity(capacity: HubCapacity, link: CapacityLink): RouteResult {
  if (capacity === "WORKER") {
    if (!link.shiftId) return { ok: false, error: "A worker check-in needs a shift (EVV/billing)." };
    return { ok: true, billable: true, shiftId: link.shiftId, accessGrantId: null };
  }
  // FAMILY | GUARDIAN
  if (!link.accessGrantId) {
    return { ok: false, error: "A family/guardian check-in needs an access grant." };
  }
  return { ok: true, billable: false, shiftId: null, accessGrantId: link.accessGrantId };
}

// ── Hub-entry stamping ────────────────────────────────────────────────────────────
// Build the additive hub columns for a LogEntry from its check-in context. The entry
// is OWNED by the logging worker's org (userId/organisationId) for RLS; the hub
// columns denormalise capacity + participant so the cross-org timeline is one read.
export type HubCheckInContext = {
  hubCheckInId: string;
  participantId: string;
  loggedByWorkerId: string;
  actingCapacity: HubCapacity;
  ownerUserId: string;
  ownerOrganisationId: string | null;
  sourceDevice?: "TABLET" | "PHONE" | null;
};

export type HubEntryStamp = {
  hubCheckInId: string;
  participantId: string;
  loggedByWorkerId: string;
  actingCapacity: HubCapacity;
  sourceDevice: string | null;
  shiftId: null;
  userId: string;
  organisationId: string | null;
};

export function stampHubEntry(ctx: HubCheckInContext): HubEntryStamp {
  return {
    hubCheckInId: ctx.hubCheckInId,
    participantId: ctx.participantId,
    loggedByWorkerId: ctx.loggedByWorkerId,
    actingCapacity: ctx.actingCapacity,
    sourceDevice: ctx.sourceDevice ?? null,
    shiftId: null, // hub path: the entry hangs off the check-in, not a Shift
    userId: ctx.ownerUserId,
    organisationId: ctx.ownerOrganisationId,
  };
}

// ── Cross-org timeline gate ─────────────────────────────────────────────────────
// Viewing the consolidated hub timeline requires an ACTIVE ParticipantAccessGrant —
// it is consent-authorised, not org-matched (HUB_DATA_MODEL.md §RLS). NotesRead is the
// capability the grant must confer on the participant.
export const HUB_TIMELINE_CAPABILITY = Capability.NotesRead;

// ── Restrictive practice ──────────────────────────────────────────────────────────
export type RpType = "PHYSICAL" | "CHEMICAL" | "MECHANICAL" | "ENVIRONMENTAL" | "SECLUSION";
export const RP_TYPES: readonly RpType[] = [
  "PHYSICAL", "CHEMICAL", "MECHANICAL", "ENVIRONMENTAL", "SECLUSION",
] as const;
export function isRpType(v: unknown): v is RpType {
  return typeof v === "string" && (RP_TYPES as readonly string[]).includes(v);
}

// An unauthorised / emergency RP use (not under the current BSP) is ALWAYS a reportable
// incident to the NDIS Commission. An explicit reportable=true is also honoured. An
// authorised use is not auto-reportable on its own.
export function deriveRpReportable(input: {
  restrictivePractice: boolean;
  rpAuthorised?: boolean | null;
  reportable?: boolean;
}): boolean {
  if (input.restrictivePractice && input.rpAuthorised === false) return true;
  return Boolean(input.reportable);
}

// ── Server-side quick-unlock PIN (shared-device tap attribution) ──────────────────
// Salted scrypt, encoded `scrypt$<saltHex>$<hashHex>`. Distinct from the client-only
// convenience lock in quick-unlock.ts — this is the per-worker attribution anchor on a
// shared HubDevice. NOT a primary auth factor (the worker logged in fully first); it
// re-confirms WHICH logged-in worker is logging this entry, for audit integrity.
const PIN_RE = /^\d{4,8}$/;
const SCRYPT_KEYLEN = 32;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export function hashHubPin(pin: string): string {
  if (!isValidPin(pin)) throw new Error("PIN must be 4–8 digits.");
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyHubPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored || !isValidPin(pin)) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  let actual: Buffer;
  try {
    actual = scryptSync(pin, salt, expected.length);
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── Real-time multi-device sync ───────────────────────────────────────────────────
// All clients of one participant's hub (shared iPad + each worker's phone) subscribe to
// ONE broadcast channel keyed by participant. The ping only says "something changed";
// each client re-pulls via the grant-gated timeline read, sidestepping the RLS-on-
// Realtime cross-org limitation (HUB_DATA_MODEL.md §Real-time multi-device sync).
export function participantChannel(participantId: string): string {
  return `hub:participant:${participantId}`;
}

export type HubBroadcastEvent = "entry" | "checkin" | "checkout" | "session";
