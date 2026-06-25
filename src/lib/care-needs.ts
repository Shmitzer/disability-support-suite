// care-needs.ts — the participant care-profile model: condition tags, support-need
// flags, the condition→flags suggestion map, and the resolution functions that decide
// which capture chips/sub-groups a given participant should see.
//
// PURE module (no DB, no React) so the mapping is deterministic and unit-tested, and
// can be imported by both client and server. The DB shape (ParticipantCareProfile) and
// the editor UI come in later phases; this is the source of truth for the mapping.
//
// Design: docs/design/participant-care-profile.md. Research (condition → need → chip):
// docs/research/ndis-condition-chip-profiles.md.
//
// Phase 1 is behaviour-NEUTRAL: every current category is `alwaysOn`, so the resolution
// below returns the full set for everyone until need-gated categories arrive (Phase 4).

import { LOG_CATEGORIES, type DetailGroup, type LogCategory } from "@/lib/log-categories";

// The reusable functional support-need flags (research §4a). A participant's profile
// holds the subset that applies to them; flags switch chips/observations on.
export const SupportNeed = {
  Dysphagia: "dysphagia",
  EnteralFeeding: "enteral_feeding",
  Seizures: "seizures",
  Continence: "continence",
  ComplexBowelCare: "complex_bowel_care",
  Catheter: "catheter",
  MobilityTransfer: "mobility_transfer",
  PressureCare: "pressure_care",
  SkinIntegrity: "skin_integrity",
  BehaviourSupportPlan: "behaviour_support_plan",
  RestrictivePractices: "restrictive_practices",
  Psychosocial: "psychosocial",
  Diabetes: "diabetes",
  Pain: "pain",
  Respiratory: "respiratory",
  CommunicationAac: "communication_aac",
  SleepMonitoring: "sleep_monitoring",
  NutritionWeight: "nutrition_weight",
  FoodSecurity: "food_security",
  Sensory: "sensory",
} as const;
export type SupportNeed = (typeof SupportNeed)[keyof typeof SupportNeed];

// The curated condition tags (research §1). Free text is NOT used — tags must be from
// this list so the suggestion mapping is deterministic.
export const CONDITIONS = [
  "Autism",
  "Intellectual disability",
  "Cerebral palsy",
  "Acquired brain injury",
  "Spinal cord injury",
  "Multiple sclerosis",
  "Motor neurone disease",
  "Down syndrome",
  "Epilepsy",
  "Muscular dystrophy",
  "Younger-onset dementia",
  "Psychosocial disability",
  "Vision impairment",
  "Hearing impairment",
  "Prader-Willi syndrome",
] as const;
export type Condition = (typeof CONDITIONS)[number];

// Condition → SUGGESTED flags (research §4b). A suggestion only — the coordinator edits
// the resolved flag set per participant. Not exhaustive of every presentation.
export const CONDITION_SUGGESTS: Record<string, SupportNeed[]> = {
  Autism: [SupportNeed.BehaviourSupportPlan, SupportNeed.CommunicationAac, SupportNeed.Sensory],
  "Intellectual disability": [SupportNeed.BehaviourSupportPlan, SupportNeed.Continence],
  "Cerebral palsy": [
    SupportNeed.MobilityTransfer,
    SupportNeed.PressureCare,
    SupportNeed.Dysphagia,
    SupportNeed.Continence,
    SupportNeed.CommunicationAac,
  ],
  "Acquired brain injury": [
    SupportNeed.BehaviourSupportPlan,
    SupportNeed.Seizures,
    SupportNeed.MobilityTransfer,
    SupportNeed.Continence,
    SupportNeed.CommunicationAac,
    SupportNeed.Psychosocial,
  ],
  "Spinal cord injury": [
    SupportNeed.MobilityTransfer,
    SupportNeed.PressureCare,
    SupportNeed.SkinIntegrity,
    SupportNeed.Catheter,
    SupportNeed.ComplexBowelCare,
  ],
  "Multiple sclerosis": [
    SupportNeed.MobilityTransfer,
    SupportNeed.Continence,
    SupportNeed.Pain,
    SupportNeed.Psychosocial,
  ],
  "Motor neurone disease": [
    SupportNeed.Dysphagia,
    SupportNeed.EnteralFeeding,
    SupportNeed.Respiratory,
    SupportNeed.CommunicationAac,
    SupportNeed.MobilityTransfer,
    SupportNeed.PressureCare,
  ],
  "Down syndrome": [
    SupportNeed.BehaviourSupportPlan,
    SupportNeed.Sensory,
  ],
  Epilepsy: [SupportNeed.Seizures],
  "Muscular dystrophy": [
    SupportNeed.MobilityTransfer,
    SupportNeed.Respiratory,
    SupportNeed.PressureCare,
  ],
  "Younger-onset dementia": [
    SupportNeed.Psychosocial,
    SupportNeed.BehaviourSupportPlan,
    SupportNeed.Continence,
    SupportNeed.SleepMonitoring,
  ],
  "Psychosocial disability": [
    SupportNeed.Psychosocial,
    SupportNeed.SleepMonitoring,
    SupportNeed.BehaviourSupportPlan,
  ],
  "Vision impairment": [SupportNeed.CommunicationAac, SupportNeed.Sensory],
  "Hearing impairment": [SupportNeed.CommunicationAac, SupportNeed.Sensory],
  "Prader-Willi syndrome": [
    SupportNeed.FoodSecurity,
    SupportNeed.NutritionWeight,
    SupportNeed.BehaviourSupportPlan,
  ],
};

// A participant's care profile as the resolution needs it. `null` = not yet configured
// (legacy / new participant) → treated as "all chips on" (the chosen default).
export type CareProfile = {
  conditions: string[];
  supportNeeds: string[]; // the resolved flags (source of truth)
} | null;

// Suggested flags for a set of condition tags (deduped union). Used to pre-tick the
// editor; the result is editable, not binding.
export function suggestNeeds(conditions: string[]): SupportNeed[] {
  const out = new Set<SupportNeed>();
  for (const c of conditions) for (const n of CONDITION_SUGGESTS[c] ?? []) out.add(n);
  return [...out];
}

// Which category keys to show for this profile.
//   • null profile (not configured) → ALL categories (legacy default: all-on).
//   • configured profile → `alwaysOn` categories ∪ those whose `need` flag is set.
// Because every current category is alwaysOn, this returns the full set today either
// way — behaviour-neutral until need-gated categories are added.
export function visibleCategoryKeys(
  profile: CareProfile,
  catalogue: LogCategory[] = LOG_CATEGORIES,
): string[] {
  if (!profile) return catalogue.map((c) => c.key);
  const needs = new Set(profile.supportNeeds ?? []);
  return catalogue
    .filter((c) => c.alwaysOn || (c.need ? needs.has(c.need) : false))
    .map((c) => c.key);
}

// Is a need-gated sub-group visible for this profile? Groups without `needWhen` are
// always visible (the `showWhen` value-gating is handled separately at render time).
// A not-yet-configured profile shows everything (all-on default).
export function isNeedGroupVisible(group: DetailGroup, profile: CareProfile): boolean {
  if (!group.needWhen) return true;
  if (!profile) return true;
  return (profile.supportNeeds ?? []).includes(group.needWhen);
}
