// rbac.ts — capability-based access control (the authorization FRAME).
//
// Why this exists: gates used to be hardcoded role checks (`role === ADMIN`).
// That doesn't scale to the enterprise model (≈32 roles across ≈6 surfaces) —
// every new role would mean hunting role literals through the codebase and
// re-plumbing auth. Instead, code asks for a CAPABILITY (a verb — "may they do
// X?"), never a role. Roles are just named bundles of capabilities, declared in
// ONE place (ROLE_CAPABILITIES). Adding the 32 roles later is then a data change
// to that map — no call site changes.
//
// Rule of thumb for the rest of the app:
//   • Authorization by ROLE  → ask `can(role, Capability.X)`. Never compare roles.
//   • Authorization by OWNERSHIP (this is MY shift/report) stays a resource check
//     (e.g. `shift.allocatedToId === worker.id`) — that's orthogonal to capability.
//
// Surfaces (worker app, coordinator console, participant portal, platform admin,
// …) are just the capability sets a role is allowed to reach; when the surface
// model lands it composes from these same capabilities.

// Type-only import: rbac is imported BY enums (for the legacy wrappers), so a
// runtime import of Role here would be a circular dependency. The type is erased
// at build, and the map below is keyed by the literal role strings (which ARE the
// Role values), so it stays exhaustively type-checked against Role with no cycle.
import type { Role } from "@/lib/enums";

// The capability vocabulary — the verbs the app gates on. Keep these
// surface-agnostic and granular enough that a future role can be handed exactly
// what it needs (e.g. a Finance role gets BillingManage without RosterManage).
export const Capability = {
  // Front-line: work shifts and write the shift log (own shift).
  ShiftWork: "shift:work",
  // Oversight: read any shift within the organisation (not just your own).
  ShiftReadOrg: "shift:read:org",
  // Rostering: create / allocate / offer / cancel shifts.
  RosterManage: "roster:manage",
  // Approve or reject worker clock-on/off amendment requests.
  ClockAmend: "clock:amend",
  // Manage the organisation's subscription / billing.
  BillingManage: "billing:manage",
  // Read the organisation's audit trail.
  AuditRead: "audit:read",
} as const;
export type Capability = (typeof Capability)[keyof typeof Capability];

// Role → capabilities. This is the WHOLE policy: editing this map (and adding
// rows to Role) is how the enterprise 32-role model slots in later — nothing
// downstream changes. Values preserve today's effective permissions exactly:
// only ADMIN is a manager; WORKER/SOLO_WORKER are front-line; the rest are seats
// reserved for capabilities to be assigned as those roles come online.
export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  SOLO_WORKER: [Capability.ShiftWork],
  WORKER: [Capability.ShiftWork],
  // SUPERVISOR / PARTICIPANT / SUPERADMIN: no capabilities granted YET (matches
  // current behaviour — only ADMIN passed the old `isRosteringRole` gate). Widen
  // here when each role becomes active; do not re-plumb call sites.
  SUPERVISOR: [],
  PARTICIPANT: [],
  ADMIN: [
    Capability.RosterManage,
    Capability.ClockAmend,
    Capability.BillingManage,
    Capability.ShiftReadOrg,
    Capability.AuditRead,
  ],
  SUPERADMIN: [],
};

// The capability set for a role (empty for unknown/null roles — deny by default).
export function capabilitiesFor(role: string | null | undefined): readonly Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role as Role] ?? [];
}

// The single authorization primitive: may a holder of `role` do `capability`?
// Deny-by-default — an unknown role or capability is always false.
export function can(role: string | null | undefined, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}
