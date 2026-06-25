// credentials.ts — pure helpers for worker credentials / training expiry, and the
// mapping from high-intensity support needs → the credential that gates them (this
// finally wires the deferred Phase-5 competency gate from care-needs.ts). Pure +
// unit-tested; the DB reads/writes live in credential-actions.ts.

import { SupportNeed, isHighIntensitySupport } from "@/lib/care-needs";

export type CredentialStatus = "VALID" | "EXPIRING" | "EXPIRED" | "NONE";

// Status of a single credential given its expiry. No expiry = treated as VALID
// (some credentials don't lapse). `warnDays` is the "expiring soon" window.
export function credentialStatus(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
  warnDays = 30,
): CredentialStatus {
  if (!expiresAt) return "VALID";
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "EXPIRED";
  if (ms <= warnDays * 24 * 60 * 60 * 1000) return "EXPIRING";
  return "VALID";
}

export function isUsable(status: CredentialStatus): boolean {
  return status === "VALID" || status === "EXPIRING"; // expiring still works (with a nudge)
}

// High-intensity support need → the credential type that authorises it. (NDIS High
// Intensity Support Skills Descriptors.) Needs not listed here require no credential.
export const COMPETENCY_FOR_NEED: Partial<Record<SupportNeed, string>> = {
  [SupportNeed.Seizures]: "epilepsy_management",
  [SupportNeed.EnteralFeeding]: "enteral_feeding",
  [SupportNeed.ComplexBowelCare]: "complex_bowel_care",
  [SupportNeed.Catheter]: "urinary_catheter",
  [SupportNeed.Respiratory]: "ventilation_tracheostomy",
  [SupportNeed.Dysphagia]: "dysphagia_mealtime",
};

// The credential type required to log/perform a support need, or null if none.
export function requiredCredentialForNeed(need: string): string | null {
  if (!isHighIntensitySupport(need)) return null;
  return COMPETENCY_FOR_NEED[need as SupportNeed] ?? null;
}
