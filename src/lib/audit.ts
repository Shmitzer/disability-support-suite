// audit.ts — recordAudit(): append one row to the cross-app audit trail (Rule 9).
//
// AuditLog is the broad account/billing/admin trail (ShiftEvent stays the per-shift
// compliance log). Best-effort by design: auditing must never break the action it
// records, so a write failure is logged, not thrown.

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function recordAudit(entry: {
  action: string; // e.g. SUBSCRIPTION_UPDATED | ROLE_CHANGED | REPORT_APPROVED
  targetType: string; // e.g. "Organisation" | "Worker" | "ShiftReport"
  targetId: string;
  actorId?: string | null; // the Worker/User who did it (null = system)
  organisationId?: string | null;
  detail?: unknown; // extra context, stored as JSON
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        actorId: entry.actorId ?? null,
        organisationId: entry.organisationId ?? null,
        detail: (entry.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("recordAudit failed:", err);
  }
}
