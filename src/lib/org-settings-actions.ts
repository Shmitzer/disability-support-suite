// org-settings-actions.ts — write organisation-wide settings. Admin only
// (Capability.OrgSettingsManage), tenant-scoped, audited.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { MAX_AUTO_SUGGEST_CAP } from "@/lib/org-settings-constants";
import { revalidatePath } from "next/cache";

export type SaveResult = { ok: boolean; error?: string };

// Set the per-shift cap on AUTOMATIC AI entry-prompt suggestions for the caller's org.
export async function saveAutoSuggestCap(cap: number): Promise<SaveResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (!can(worker.role, Capability.OrgSettingsManage)) {
    return { ok: false, error: "You don't have permission to change settings." };
  }
  if (!worker.organisationId) return { ok: false, error: "No organisation to configure." };

  // Clamp to a sane range (whole number, 0…MAX). 0 disables auto-suggest entirely.
  const value = Math.max(0, Math.min(MAX_AUTO_SUGGEST_CAP, Math.round(Number(cap) || 0)));

  try {
    await prisma.organisation.update({
      where: { id: worker.organisationId },
      data: { autoSuggestCap: value },
    });
  } catch (err) {
    console.error("saveAutoSuggestCap failed:", err);
    return { ok: false, error: "Couldn't save — the settings column may not be set up yet." };
  }

  await recordAudit({
    action: "ORG_SETTINGS_UPDATED",
    targetType: "Organisation",
    targetId: worker.organisationId,
    actorId: worker.id,
    organisationId: worker.organisationId,
    detail: { autoSuggestCap: value },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
