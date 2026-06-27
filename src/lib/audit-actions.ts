// audit-actions.ts — server action exposing the tamper-evident audit-chain
// verification (verifyAuditChain was defined but had no caller). Gated on AuditRead
// for the actor's organisation. Used by the future audit viewer + integrity checks.

"use server";

import { getCurrentUser } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { verifyAuditChain } from "@/lib/audit";

export async function verifyAuditChainNow() {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false as const, error: "Not signed in." };

  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.AuditRead, { organisationId: worker.organisationId })) {
    return { ok: false as const, error: "You don't have permission to verify the audit trail." };
  }

  const result = await verifyAuditChain(worker.organisationId ?? null);
  return { ok: true as const, result };
}
