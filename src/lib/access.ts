// access.ts — bridges the DB to the pure capability check in rbac.ts, and ties
// every participant-scoped access decision to the tamper-evident audit trail.
//
// rbac.ts `can()` is pure (takes a Principal value). This module:
//   • resolvePrincipal()        — builds a Principal from the DB: the UNION of a
//                                 worker's org memberships AND their active
//                                 participant grants (+ platform-admin override).
//   • accessAuditEntry()        — the audit record describing an access decision
//                                 (pure; the same shape recordAudit() takes).
//   • authorizeParticipantAccess() — check + audit in one call (server path).
//
// Why "active grant" matters: an external carer's access must lapse on expiry or
// revocation, so resolvePrincipal filters grants to status=ACTIVE within their
// [startsAt, expiresAt] window before they ever reach can().

import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { can, type Capability, type Principal, type Resource } from "@/lib/rbac";
import { Role } from "@/lib/enums";
import { getCurrentUser } from "@/lib/session";

// The Principal for the currently signed-in worker (org memberships ∪ active
// participant grants). null when not signed in. This is what makes participant
// GRANTS actually enforce — call sites do `can(await getCurrentPrincipal(), cap,
// { participantId })` for participant-scoped access instead of an org-role check.
export async function getCurrentPrincipal(now: Date = new Date()): Promise<Principal | null> {
  const worker = await getCurrentUser();
  if (!worker) return null;
  return resolvePrincipal(worker.id, now);
}

// Convenience: does the current principal hold `capability` for `resource`?
export async function currentCan(capability: Capability, resource?: Resource): Promise<boolean> {
  const principal = await getCurrentPrincipal();
  return !!principal && can(principal, capability, resource);
}

// Is a grant row currently in force at time `now`?
export function isGrantActive(
  grant: { status: string; startsAt: Date | null; expiresAt: Date | null },
  now: Date,
): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.startsAt && grant.startsAt.getTime() > now.getTime()) return false;
  if (grant.expiresAt && grant.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

// Build the authorization context for a worker: org memberships ∪ active
// participant grants (+ platform-admin override). Falls back to the legacy
// Worker.role/organisationId as a synthesized membership so the system is correct
// from day one — before any Membership rows exist — and stays resilient if the
// grant tables aren't live yet (the new-table reads are best-effort).
export async function resolvePrincipal(workerId: string, now: Date = new Date()): Promise<Principal> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true, role: true, organisationId: true },
  });

  const memberships: Principal["memberships"] = [];
  const grants: Principal["grants"] = [];
  let platformAdmin = false;

  // Legacy single-role membership (until Membership rows are populated).
  if (worker?.organisationId && worker.role) {
    memberships.push({ organisationId: worker.organisationId, role: worker.role });
  }
  if (worker?.role === Role.SUPERADMIN) platformAdmin = true;

  // Explicit Membership rows (the generalised model). Best-effort: the table may
  // not be live yet (prisma/sql/rbac_grants.sql is applied by hand).
  try {
    const rows = await prisma.membership.findMany({
      where: { workerId, status: "ACTIVE" },
      select: { organisationId: true, role: true },
    });
    for (const r of rows) memberships.push({ organisationId: r.organisationId, role: r.role });
  } catch {
    /* table not present yet — legacy membership above still applies */
  }

  // Active participant grants.
  try {
    const rows = await prisma.participantAccessGrant.findMany({
      where: { principalId: workerId, status: "ACTIVE" },
      select: { participantId: true, role: true, status: true, startsAt: true, expiresAt: true },
    });
    for (const r of rows) {
      if (isGrantActive(r, now)) grants.push({ participantId: r.participantId, role: r.role });
    }
  } catch {
    /* grant table not present yet */
  }

  return { workerId, memberships, grants, platformAdmin };
}

// The audit record for an access decision — pure, so it's unit-testable and so the
// exact same shape is used whether the action is allowed or denied. Denied attempts
// are audited too (that's the point of an access log).
export function accessAuditEntry(
  principal: Principal,
  capability: Capability,
  resource: Resource,
  allowed: boolean,
): {
  action: string;
  targetType: string;
  targetId: string;
  actorId: string | null;
  organisationId: string | null;
  detail: Record<string, unknown>;
} {
  return {
    action: allowed ? "ACCESS_GRANTED" : "ACCESS_DENIED",
    targetType: resource.participantId ? "Participant" : "Organisation",
    targetId: resource.participantId ?? resource.organisationId ?? "unknown",
    actorId: principal.workerId ?? null,
    organisationId: resource.organisationId ?? null,
    detail: { capability, allowed },
  };
}

// Check a participant-scoped action AND audit it (Rule 9). Returns the decision;
// the caller stops on false. Every call — allow or deny — leaves an audit row, so
// an external carer's reads/writes are fully accountable.
export async function authorizeParticipantAccess(
  principal: Principal,
  capability: Capability,
  resource: Resource,
): Promise<boolean> {
  const allowed = can(principal, capability, resource);
  await recordAudit(accessAuditEntry(principal, capability, resource, allowed));
  return allowed;
}
