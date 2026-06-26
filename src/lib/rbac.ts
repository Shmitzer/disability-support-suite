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
  // Manage a participant's care profile (condition tags + support-need flags).
  CareProfileManage: "care_profile:manage",
  // Manage organisation-wide settings (e.g. the auto-suggest cap).
  OrgSettingsManage: "org_settings:manage",
  // Supervisor sign-off: approve / reopen another worker's shift report (note).
  NoteApprove: "notes:approve",
  // Review / close incidents in the org register.
  IncidentManage: "incident:manage",
  // Manage worker credentials / training records.
  CredentialManage: "credential:manage",
  // De-identify ("right to erasure") a participant record. High-trust, admin-only.
  ParticipantErase: "participant:erase",

  // Participant-scoped capabilities (used by external/family carer + guardian
  // grants, see GRANT_ROLE_CAPABILITIES). These are only ever held against a
  // SPECIFIC participant via a ParticipantAccessGrant — never org-wide.
  NotesRead: "notes:read", // view a participant's progress notes
  MedicationSubmit: "medication:submit", // record a medication administration
  RoutineSubmit: "routine:submit", // record a routine / daily-living entry
  HandoverReceive: "handover:receive", // receive shift handover for the participant
  FeedbackSubmit: "feedback:submit", // submit feedback about the participant's support
  ConsentManage: "consent:manage", // grant/withdraw consent on the participant's behalf
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
  // Supervisor: oversight + note sign-off + incident/credential management.
  SUPERVISOR: [
    Capability.ShiftReadOrg,
    Capability.NoteApprove,
    Capability.IncidentManage,
    Capability.CredentialManage,
  ],
  PARTICIPANT: [],
  ADMIN: [
    Capability.RosterManage,
    Capability.ClockAmend,
    Capability.BillingManage,
    Capability.ShiftReadOrg,
    Capability.AuditRead,
    Capability.CareProfileManage,
    Capability.OrgSettingsManage,
    Capability.NoteApprove,
    Capability.IncidentManage,
    Capability.CredentialManage,
    Capability.ParticipantErase,
  ],
  SUPERADMIN: [],
};

// --- Participant-grant roles ------------------------------------------------
//
// A second role namespace, distinct from org-membership Roles: these are granted
// to a principal against a SINGLE participant via a ParticipantAccessGrant (e.g.
// an external family carer, or a participant's legal guardian). Their capabilities
// only ever apply to that one participant's resources — never org-wide. Seeded
// here per the spec; add grant roles by editing this map alone.
export type GrantRole = "family_carer_clinical" | "participant_guardian";

export const GRANT_ROLE_CAPABILITIES: Record<GrantRole, readonly Capability[]> = {
  // External carer with clinical involvement (the NLS / Zef / mother case): can
  // read the participant's notes, record medication + routine entries, receive
  // handover, and give feedback — and nothing else, for that one participant.
  family_carer_clinical: [
    Capability.NotesRead,
    Capability.MedicationSubmit,
    Capability.RoutineSubmit,
    Capability.HandoverReceive,
    Capability.FeedbackSubmit,
  ],
  // Legal/decision-making guardian: oversight + consent authority for the
  // participant (no medication administration — that's a hands-on care act).
  participant_guardian: [
    Capability.NotesRead,
    Capability.RoutineSubmit,
    Capability.HandoverReceive,
    Capability.FeedbackSubmit,
    Capability.ConsentManage,
  ],
};

// The capability set for an org role (empty for unknown/null roles — deny by default).
export function capabilitiesFor(role: string | null | undefined): readonly Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role as Role] ?? [];
}

// The capability set for a participant-grant role (empty for unknown roles).
export function grantCapabilitiesFor(role: string | null | undefined): readonly Capability[] {
  if (!role) return [];
  return GRANT_ROLE_CAPABILITIES[role as GrantRole] ?? [];
}

// --- Principal & resource ---------------------------------------------------
//
// A Principal is the resolved authorization context for an actor: the UNION of
// the org roles they hold (via Membership) and the active participant grants they
// hold (via ParticipantAccessGrant), plus an optional platform-admin override.
// It's a plain value (no DB) so `can()` stays pure and testable; build one with
// resolvePrincipal() in src/lib/access.ts.
export type Principal = {
  workerId?: string;
  // Org-membership roles: each role applies to resources in THAT organisation.
  memberships: { organisationId: string; role: string }[];
  // Active participant grants: each role applies ONLY to that participant.
  grants: { participantId: string; role: string }[];
  // Platform-level override (internal SUPERADMIN seat). Grants everything.
  platformAdmin?: boolean;
};

// What an action is being performed against. Org capabilities require the
// resource to be in the actor's org; participant-grant capabilities require the
// resource to be that participant's. Omitting a field widens the match for the
// org path (an org-wide capability with no specific resource still resolves).
export type Resource = {
  organisationId?: string | null;
  participantId?: string | null;
};

// The single authorization primitive — two forms:
//
//   can(role, capability)
//     Legacy/shorthand: does an actor holding this ORG role inherently have the
//     capability? (No resource scoping.) Used by the existing org-staff gates.
//
//   can(principal, capability, resource?)
//     Full resolution: TRUE if the principal is a platform admin, OR holds the
//     capability through an org membership matching the resource's org, OR holds
//     it through an active participant grant matching the resource's participant.
//     Deny-by-default everywhere else.
export function can(role: string | null | undefined, capability: Capability): boolean;
export function can(principal: Principal, capability: Capability, resource?: Resource): boolean;
export function can(
  subject: string | null | undefined | Principal,
  capability: Capability,
  resource?: Resource,
): boolean {
  // Legacy/shorthand form: a bare org-role string (or null).
  if (subject === null || subject === undefined || typeof subject === "string") {
    return capabilitiesFor(subject).includes(capability);
  }

  // Principal form: platform override first.
  if (subject.platformAdmin) return true;

  // Org-membership path: a membership grants the capability for resources in its
  // org. If the resource names an org, the membership must be in that same org.
  for (const m of subject.memberships) {
    if (resource?.organisationId && m.organisationId !== resource.organisationId) continue;
    if (capabilitiesFor(m.role).includes(capability)) return true;
  }

  // Participant-grant path: only for a resource that names a participant, and only
  // from a grant on THAT participant. This is what scopes an external carer to one
  // person and nothing else.
  if (resource?.participantId) {
    for (const g of subject.grants) {
      if (g.participantId !== resource.participantId) continue;
      if (grantCapabilitiesFor(g.role).includes(capability)) return true;
    }
  }

  return false;
}
