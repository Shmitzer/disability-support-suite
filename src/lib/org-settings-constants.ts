// org-settings-constants.ts — pure constants for org settings, safe to import from
// client components (no Prisma / server-only deps, unlike org-settings.ts).

export const DEFAULT_AUTO_SUGGEST_CAP = 3;
export const MAX_AUTO_SUGGEST_CAP = 20;

// Caira character system is shown by default; admins can switch it off org-wide.
export const DEFAULT_CAIRA_ENABLED = true;
