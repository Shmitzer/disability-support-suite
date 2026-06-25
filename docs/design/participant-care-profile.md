# Design — Participant care profile → tailored capture chips

**Goal.** Show each participant only the capture chips that match their *functional
support needs*, derived from condition tags + editable support-need flags. Built on the
research in [`docs/research/ndis-condition-chip-profiles.md`](../research/ndis-condition-chip-profiles.md).

**Status:** design (the agreed step after the research report). Schema changes here are
written as checked-in SQL and **not** applied automatically, per project convention.

---

## 1. Principles
- **Flags are the source of truth.** A *condition tag* only **seeds** a suggested flag
  set; the coordinator edits the flags per participant.
- **Additive, never breaks.** A participant with no profile → today's universal chip
  set (no behaviour change). Reads must tolerate the profile being absent.
- **One mapping, in code.** Condition→flags and flag→chips live in one pure module so
  they're testable and can't drift (same discipline as `note-extraction.ts`).
- **Composes with sector config.** Final visible set = *sector baseline* refined by
  *participant flags*. Sector work can land before or after; this design doesn't block on it.
- **Reuse `showWhen`.** Conditional sub-groups already work (Bristol, PRN-effect); we add
  one sibling concept (`needWhen`) keyed on profile flags rather than sibling values.

---

## 2. Data model

### 2a. Flags & mapping (code — `src/lib/care-needs.ts`, pure)
```ts
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

// Condition tag → suggested flags (section 4b of the research). Suggestion only.
export const CONDITION_SUGGESTS: Record<string, SupportNeed[]> = { /* … */ };

// Flag → per-flag config schema (e.g. IDDSI levels, repositioning interval).
export type NeedConfig = {
  iddsiFluid?: number;        // 0–4
  iddsiFood?: number;         // 3–7
  repositionMins?: number;    // e.g. 120
};
```
Condition tags are themselves a small curated list (the research's section 1) — not free
text — so suggestions are deterministic.

### 2b. Category/group annotations (extend `log-categories.ts`)
Add optional fields so the catalogue itself declares what each chip needs:
```ts
type LogCategory = {
  …;
  alwaysOn?: boolean;        // universal (Food, Drink, Meds, Note, Incident, Sleep?)
  need?: SupportNeed;        // tile shown only when this flag is set
};
type DetailGroup = {
  …;
  needWhen?: SupportNeed;    // group shown only when this flag is set
};
```
Examples: a new `Seizure`/`Health` tile gets `need: "seizures"`; Drink's IDDSI-level
group gets `needWhen: "dysphagia"`; Toilet's `bowel chart` group gets
`needWhen: "complex_bowel_care"`; Repositioning tile `need: "pressure_care"`.

### 2c. Persistence (schema → `prisma/sql/participant_care_profile.sql`, NOT applied)
Dedicated 1:1 table (keeps `Participant` lean; allows future versioning + audit):
```prisma
model ParticipantCareProfile {
  id             String   @id @default(cuid())
  participantId  String   @unique
  conditions     String[] // condition tags
  supportNeeds   String[] // resolved flags (the source of truth)
  needConfig     Json?    // per-flag config (IDDSI levels, reposition interval)
  organisationId String?
  updatedById    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @default(now()) @updatedAt
}
```
*(Simpler alternative: three columns on `Participant`. Dedicated table preferred for
audit/versioning and to avoid widening the hot `Participant` reads.)*

---

## 3. Resolution & chip filtering (pure — testable)
```ts
// care-needs.ts
export function suggestNeeds(conditions: string[]): SupportNeed[];   // condition → flags
export function visibleCategories(profile, sectorBaseline): string[]; // tiles to show
export function isGroupVisible(group, profile): boolean;             // needWhen gate
```
- `visibleCategories` = `alwaysOn` categories ∪ categories whose `need` flag is in the
  profile (∩ sector baseline when sector config lands). **No profile → all categories**
  (current behaviour).
- `DetailFields` filters groups by `needWhen` (in addition to the existing `showWhen`).
- `ShiftTracker` replaces the hardcoded `TILE_KEYS` with `visibleCategories(profile)`,
  passed down from the shift page (which already loads the participant).

---

## 4. UI — care-profile editor
- **Where:** participant record (and/or `/admin`). New screen, capability-gated.
- **Flow:** pick condition tag(s) → flags auto-tick (suggested) → coordinator edits the
  flag toggles → per-flag config where relevant (IDDSI level, reposition interval).
- **Capability:** a new `Capability.CareProfileManage` (rbac.ts) — coordinators/clinical
  roles only; front-line workers see the resolved chips but don't edit the profile.
- **Audit:** editing a profile is sensitive → `recordAudit("CARE_PROFILE_UPDATED", …)`
  (flows into the tamper-evident chain).

---

## 5. Interactions
- **Note extraction:** `extractionCatalogue()` should be scoped to the participant's
  visible categories so the LLM only maps to chips that participant actually uses
  (pass the resolved set into `extractLogItems`).
- **Sector config:** participant flags refine the sector baseline; if sector work isn't
  in yet, baseline = all categories.
- **High-intensity competency:** flags like `enteral_feeding`, `seizures`,
  `complex_bowel_care`, `catheter`, `respiratory` are high-intensity supports — later,
  gate the *worker* on a training/credential check before they can log them (per the
  High Intensity Support Skills Descriptors). Out of scope for v1, noted for the model.

---

## 6. New chips this unlocks (built as flags switch them on)
Beyond the existing set, the profile model is what justifies adding: **Seizure / Health
& Observation** (seizures, diabetes BGL, pain), **Feed/PEG** (enteral), **Transfer**,
**Repositioning**, **Wound**, **Behaviour** (ABC + restrictive-practice recording),
**Respiratory**. Each is added once with `need:` set, so it only appears for relevant
participants — solving the grid-clutter trade-off.

---

## 7. Phasing (each independently shippable, green)
1. ✅ **Model + mapping (no behaviour change).** `care-needs.ts` (flags, condition map,
   resolution) + category/group annotations + the SQL (unapplied) + unit tests.
2. ✅ **Chip filtering.** `ShiftTracker` (`TILE_KEYS ∩ visibleKeys`) + `DetailFields`
   (`needWhen`) consume the resolution; participants with a profile see a tailored grid,
   without one unchanged. Fed from `getCareProfile` (resilient → null when unconfigured).
3. ✅ **Profile editor UI** at `/participants/[id]/care-profile` + `Capability.CareProfileManage`
   + audited save (`CARE_PROFILE_UPDATED`).
4. ✅ **Need-gated chips + IDDSI + extraction scoping.** Behaviour, Seizure,
   Repositioning tiles (need-gated) + IDDSI fluid/food groups (`needWhen=dysphagia`) +
   restrictive-practice group (`needWhen=restrictive_practices`); note extraction scoped
   to enabled chips. (Further chips — Feed/PEG, Transfer, Wound, Respiratory, Diabetes —
   follow the same pattern when wanted.)
5. ⏸ **Competency gating** for high-intensity flags — **DEFERRED**: needs a worker
   credential/training model (the "Credentials" module in the Drive notes), which
   doesn't exist yet. The hook is in place: `HIGH_INTENSITY_NEEDS` / `isHighIntensitySupport()`
   in `care-needs.ts` mark which flags require competency; once credentials land, gate
   visibility/logging of those chips on `workerHasCompetency(worker, need)`.

---

## 8. Risks / decisions to confirm
- **Dedicated table vs columns on Participant** (recommend table).
- **Who edits profiles** (coordinator/clinical only — confirm the capability).
- **Default for legacy participants** (all chips on — confirm; alternative is a lean
  default set).
- **Clinical sign-off** on the flag→chip wording before Phase 4 ships to real users.
