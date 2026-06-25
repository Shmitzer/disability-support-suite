// roles.ts — maps the app's org Role (enums.ts) onto the three Caira personas.
//
// The handover speaks in terms of "worker" | "participant" | "supervisor". The app
// has a richer Role enum; this is the single place that collapses it to a persona so
// the API route, prompts, and UI all agree on who Caira is talking to.

import { Role } from "@/lib/enums";

export type CairaPersona = "worker" | "participant" | "supervisor";

// Collapse an org Role to a Caira persona.
//   PARTICIPANT                     → participant (simple/adjusted language, guardrails)
//   SUPERVISOR / ADMIN / SUPERADMIN → supervisor  (oversight, reporting, flag review)
//   WORKER / SOLO_WORKER / other    → worker       (shift-focused, compliance-aware)
export function cairaPersona(role: string | null | undefined): CairaPersona {
  switch (role) {
    case Role.PARTICIPANT:
      return "participant";
    case Role.SUPERVISOR:
    case Role.ADMIN:
    case Role.SUPERADMIN:
      return "supervisor";
    default:
      return "worker";
  }
}

// Can this role ever be granted Caira web access? Participants NEVER can — this is a
// hard code-level guardrail, one of three (Prisma default, /api/caira override, and
// the /api/admin/caira-access refusal). See the Web Access handover.
//
// TODO(participant web access): if participants are ever considered for web access it
// requires a separate legal/privacy review, a curated safe-domain allowlist (not full
// web search), and a guardian/coordinator approval flow. Do not relax this without it.
export function webAccessAllowedForRole(role: string | null | undefined): boolean {
  return role !== Role.PARTICIPANT;
}

// Can this role grant/revoke web access for others? Admin (and platform superadmin)
// and supervisors only — never workers or participants.
export function canManageWebAccess(role: string | null | undefined): boolean {
  return role === Role.ADMIN || role === Role.SUPERADMIN || role === Role.SUPERVISOR;
}
