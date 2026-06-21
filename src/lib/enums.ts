// enums.ts — central role / sector / status string constants.
//
// On SQLite these are plain strings; they become native Prisma enums at the
// PostgreSQL migration (Phase D). Keep ALL role/sector logic flowing through here
// so permission gates can be widened progressively (the spec's "implement gates
// as each role becomes active") without hunting string literals across the app.

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

// Can this role roster/manage (see all shifts, approve clock amendments, etc.)?
// The legacy "ROSTERING" role maps to ADMIN. This is the one place to widen who
// counts as a manager later (e.g. fold in SUPERVISOR / SUPERADMIN).
export function isRosteringRole(role: string | null | undefined): boolean {
  return role === Role.ADMIN;
}

// Front-line worker who actually works shifts (SOLO_WORKER and WORKER both do).
export function isWorkerRole(role: string | null | undefined): boolean {
  return role === Role.WORKER || role === Role.SOLO_WORKER;
}

// Human-readable label for the dev role-switcher and similar UI.
export function roleLabel(role: string | null | undefined): string {
  return isRosteringRole(role) ? "Rostering" : "Worker";
}
