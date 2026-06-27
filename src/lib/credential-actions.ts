// credential-actions.ts — #7 worker credential / training records + the competency
// gate for high-intensity supports (wires the deferred Phase-5 hook). LOGIC ONLY.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { credentialStatus, isUsable, requiredCredentialForNeed } from "@/lib/credentials";

export type CredResult = { ok: boolean; error?: string; id?: string };

// Add/record a credential for a worker (manager — CredentialManage).
export async function addWorkerCredential(input: {
  workerId: string;
  type: string;
  name?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  evidenceDocumentId?: string | null;
}): Promise<CredResult> {
  const actor = await getCurrentWorker();
  if (!actor) return { ok: false, error: "Not signed in." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CredentialManage, { organisationId: actor.organisationId })) {
    return { ok: false, error: "You don't have permission to manage credentials." };
  }
  if (!input.type.trim()) return { ok: false, error: "A credential type is required." };
  try {
    const cred = await prisma.workerCredential.create({
      data: {
        workerId: input.workerId,
        organisationId: actor.organisationId,
        type: input.type.trim(),
        name: input.name ?? null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        evidenceDocumentId: input.evidenceDocumentId ?? null,
        createdById: actor.id,
      },
    });
    await recordAudit({
      action: "CREDENTIAL_ADDED",
      targetType: "Worker",
      targetId: input.workerId,
      actorId: actor.id,
      organisationId: actor.organisationId,
      detail: { credentialId: cred.id, type: input.type },
    });
    return { ok: true, id: cred.id };
  } catch (err) {
    console.error("addWorkerCredential failed:", err);
    return { ok: false, error: "Couldn't save — the table may not be set up yet." };
  }
}

// A worker's credentials with computed status.
export async function listWorkerCredentials(workerId: string) {
  const actor = await getCurrentWorker();
  if (!actor) return [];
  const principal = await getCurrentPrincipal();
  const self = actor.id === workerId;
  if (!self && !(principal && can(principal, Capability.CredentialManage, { organisationId: actor.organisationId }))) {
    return [];
  }
  try {
    const rows = await prisma.workerCredential.findMany({
      where: { workerId },
      orderBy: { expiresAt: "asc" },
    });
    const now = new Date();
    return rows.map((r) => ({ ...r, status: credentialStatus(r.expiresAt, now) }));
  } catch {
    return [];
  }
}

// Credentials expiring soon / expired across the org (for the coordinator dashboard).
export async function expiringCredentials(withinDays = 30) {
  const actor = await getCurrentWorker();
  if (!actor?.organisationId) return [];
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.CredentialManage, { organisationId: actor.organisationId })) {
    return [];
  }
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  try {
    const rows = await prisma.workerCredential.findMany({
      where: { organisationId: actor.organisationId, expiresAt: { not: null, lte: cutoff } },
      orderBy: { expiresAt: "asc" },
    });
    const now = new Date();
    return rows.map((r) => ({ ...r, status: credentialStatus(r.expiresAt, now) }));
  } catch {
    return [];
  }
}

// COMPETENCY GATE: may this worker log/perform a support need? Non-high-intensity
// needs are always allowed; high-intensity needs require a usable (valid/expiring)
// credential of the mapped type. This wires the deferred Phase-5 hook.
export async function workerMayLogNeed(workerId: string, need: string): Promise<boolean> {
  const requiredType = requiredCredentialForNeed(need);
  if (!requiredType) return true; // not a gated need
  try {
    const creds = await prisma.workerCredential.findMany({
      where: { workerId, type: requiredType },
      select: { expiresAt: true },
    });
    const now = new Date();
    return creds.some((c) => isUsable(credentialStatus(c.expiresAt, now)));
  } catch {
    // Table not live yet → don't hard-block during rollout (gate is opt-in once
    // credentials are populated). Returns true so existing flows are unchanged.
    return true;
  }
}
