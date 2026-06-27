// access-actions.ts — server actions to GRANT and REVOKE a participant-scoped
// access grant (the family-carer / guardian model). The ParticipantAccessGrant and
// Consent tables already exist; this is the write path that was missing.
//
// Authorization: the actor must be able to manage the participant — either org
// CareProfileManage in the participant's org (coordinator), or ConsentManage on the
// participant (a guardian acting on their behalf). Every grant writes a linked
// Consent record and an audit entry (Rule 9).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability, GRANT_ROLE_CAPABILITIES } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type AccessResult = { ok: boolean; error?: string; grantId?: string };

const GRANT_ROLES = new Set(Object.keys(GRANT_ROLE_CAPABILITIES));

// Grant `principalId` (a Worker) access to ONE participant under a grant role.
export async function grantParticipantAccess(input: {
  principalId: string;
  participantId: string;
  role: string; // a GrantRole, e.g. "family_carer_clinical" | "participant_guardian"
  method?: string; // how consent was captured, e.g. "guardian_signed"
  expiresAt?: string | null;
}): Promise<AccessResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!GRANT_ROLES.has(input.role)) return { ok: false, error: "Unknown access role." };

  const participant = await prisma.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };

  const principal = await getCurrentPrincipal();
  const allowed =
    !!principal &&
    (can(principal, Capability.CareProfileManage, { organisationId: participant.organisationId }) ||
      can(principal, Capability.ConsentManage, { participantId: participant.id }));
  if (!allowed) {
    return { ok: false, error: "You don't have permission to grant access to this participant." };
  }

  const target = await prisma.worker.findUnique({
    where: { id: input.principalId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "The person to grant access to was not found." };

  try {
    const grant = await prisma.$transaction(async (tx) => {
      const consent = await tx.consent.create({
        data: {
          participantId: participant.id,
          scope: "external_carer_access",
          grantedToPrincipalId: input.principalId,
          status: "GRANTED",
          method: input.method ?? null,
          capturedById: worker.id,
          organisationId: participant.organisationId,
        },
      });
      return tx.participantAccessGrant.create({
        data: {
          principalId: input.principalId,
          participantId: participant.id,
          role: input.role,
          organisationId: participant.organisationId,
          status: "ACTIVE",
          grantedById: worker.id,
          consentId: consent.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      });
    });

    await recordAudit({
      action: "PARTICIPANT_ACCESS_GRANTED",
      targetType: "Participant",
      targetId: participant.id,
      actorId: worker.id,
      organisationId: participant.organisationId,
      detail: { principalId: input.principalId, role: input.role, grantId: grant.id },
    });
    revalidatePath(`/participants/${participant.id}`);
    return { ok: true, grantId: grant.id };
  } catch (err) {
    console.error("grantParticipantAccess failed:", err);
    return { ok: false, error: "Couldn't grant access — the access tables may not be set up yet." };
  }
}

// Revoke a grant + withdraw its linked consent.
export async function revokeParticipantAccess(grantId: string): Promise<AccessResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };

  const grant = await prisma.participantAccessGrant.findUnique({
    where: { id: grantId },
    select: { id: true, participantId: true, organisationId: true, consentId: true },
  });
  if (!grant) return { ok: false, error: "Access grant not found." };

  const principal = await getCurrentPrincipal();
  const allowed =
    !!principal &&
    (can(principal, Capability.CareProfileManage, { organisationId: grant.organisationId }) ||
      can(principal, Capability.ConsentManage, { participantId: grant.participantId }));
  if (!allowed) return { ok: false, error: "You don't have permission to revoke this access." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.participantAccessGrant.update({ where: { id: grantId }, data: { status: "REVOKED" } });
      if (grant.consentId) {
        await tx.consent.update({
          where: { id: grant.consentId },
          data: { status: "WITHDRAWN", withdrawnAt: new Date() },
        });
      }
    });

    await recordAudit({
      action: "PARTICIPANT_ACCESS_REVOKED",
      targetType: "Participant",
      targetId: grant.participantId,
      actorId: worker.id,
      organisationId: grant.organisationId,
      detail: { grantId },
    });
    revalidatePath(`/participants/${grant.participantId}`);
    return { ok: true, grantId };
  } catch (err) {
    console.error("revokeParticipantAccess failed:", err);
    return { ok: false, error: "Couldn't revoke access." };
  }
}
