// enums.ts — central role / sector / status string constants.
//
// On SQLite these are plain strings; they become native Prisma enums at the
// PostgreSQL migration (Phase D). Keep ALL role/sector logic flowing through here
// so permission gates can be widened progressively (the spec's "implement gates
// as each role becomes active") without hunting string literals across the app.

import { can, Capability } from "@/lib/rbac";

export const Role = {
  SOLO_WORKER: "SOLO_WORKER", // independent support worker, no org
  WORKER: "WORKER", // worker within an organisation
  SUPERVISOR: "SUPERVISOR", // can view/approve worker notes within org
  ADMIN: "ADMIN", // full org management (formerly the "ROSTERING" role)
  PARTICIPANT: "PARTICIPANT", // NDIS participant (future self-managed portal)
  SUPERADMIN: "SUPERADMIN", // platform-level admin (internal use only)
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SectorMode = {
  NDIS: "NDIS",
  AGED_CARE: "AGED_CARE",
  MENTAL_HEALTH: "MENTAL_HEALTH",
  COMMUNITY_SERVICES: "COMMUNITY_SERVICES",
  EARLY_CHILDHOOD: "EARLY_CHILDHOOD",
} as const;
export type SectorMode = (typeof SectorMode)[keyof typeof SectorMode];

// Legacy role predicates — now thin wrappers over the capability layer (rbac.ts)
// so all authorization flows through one policy map. Prefer `can(role, Capability.X)`
// directly in new code; these remain for `roleLabel` and coarse "is a manager /
// is a worker" UI checks. Behaviour is identical to the old hardcoded checks
// (ADMIN manages; WORKER/SOLO_WORKER work) because that's how ROLE_CAPABILITIES
// is seeded.
export function isRosteringRole(role: string | null | undefined): boolean {
  return can(role, Capability.RosterManage);
}

// Front-line worker who actually works shifts (SOLO_WORKER and WORKER both do).
export function isWorkerRole(role: string | null | undefined): boolean {
  return can(role, Capability.ShiftWork);
}

// Human-readable label for the dev role-switcher and similar UI.
export function roleLabel(role: string | null | undefined): string {
  return isRosteringRole(role) ? "Rostering" : "Worker";
}
