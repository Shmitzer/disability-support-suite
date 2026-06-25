// org-settings.ts — read of organisation-wide settings, with safe fallbacks.
//
// Resilient: if a setting's column hasn't been applied yet (prisma/sql convention) or
// the org row is missing, callers get the default so the app keeps working before the
// migration lands.

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AUTO_SUGGEST_CAP,
  MAX_AUTO_SUGGEST_CAP,
  DEFAULT_CAIRA_ENABLED,
} from "@/lib/org-settings-constants";

export { DEFAULT_AUTO_SUGGEST_CAP, MAX_AUTO_SUGGEST_CAP, DEFAULT_CAIRA_ENABLED };

// Max AUTOMATIC AI entry-prompt suggestions per shift for this org (manual taps are
// never capped). Falls back to the default when unset / unavailable.
export async function getOrgAutoSuggestCap(
  organisationId: string | null | undefined,
): Promise<number> {
  if (!organisationId) return DEFAULT_AUTO_SUGGEST_CAP;
  try {
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { autoSuggestCap: true },
    });
    const cap = org?.autoSuggestCap;
    return typeof cap === "number" && cap >= 0 ? cap : DEFAULT_AUTO_SUGGEST_CAP;
  } catch {
    return DEFAULT_AUTO_SUGGEST_CAP; // column not applied yet
  }
}

// Whether the Caira character system is enabled for this org. Falls back to the
// default (on) when unset / unavailable, so the app behaves before the migration.
export async function getOrgCairaEnabled(
  organisationId: string | null | undefined,
): Promise<boolean> {
  if (!organisationId) return DEFAULT_CAIRA_ENABLED;
  try {
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { cairaEnabled: true },
    });
    const enabled = org?.cairaEnabled;
    return typeof enabled === "boolean" ? enabled : DEFAULT_CAIRA_ENABLED;
  } catch {
    return DEFAULT_CAIRA_ENABLED; // column not applied yet
  }
}
