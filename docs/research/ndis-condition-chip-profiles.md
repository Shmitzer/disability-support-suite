# NDIS Conditions → Support-Need Profiles → Capture Chips (research)

**Purpose.** Background research for participant-tailored capture chips in Caira: when a
worker opens a participant's shift log, the chips and observation fields shown should
match that participant's *functional support needs*, not a generic list. This report
maps **NDIS disability groups → common conditions → functional support needs → the
specific data points a worker records on shift → reusable "support-need flags"** that
switch chips on. Section 4 is the actionable mapping the data model will be built from.

> **Design principle (confirmed):** chips are driven by **functional support needs**,
> not diagnoses. A *condition tag* on a participant **auto-suggests** a set of
> support-need flags; the flags (each editable per participant) are what actually
> switch chips/observations on. Two people with the same diagnosis can have very
> different profiles — the flags are the source of truth.

*Status: research deliverable (report first). The profile data model + chip-filtering
design follows separately. Not legal/clinical advice — validate the flag→chip wording
with a clinical/practice lead before production.*

---

## 1. NDIS disability groups & common conditions

NDIS participants are recorded against a **primary disability**, but most have several
conditions and what matters for logging is the support profile. Approximate primary-
disability distribution (NDIS quarterly data, ~2023–24):

| Primary disability | Share / count | Notes for logging |
|---|---|---|
| **Autism** | ~35% (largest group) | Behaviour support, communication/AAC, sensory, routine; mostly *not* high-intensity health |
| **Intellectual disability** | ~15% | Behaviour, medication, mealtime, variable continence |
| **Developmental delay / GDD** | ~11% (mostly under 9) | Early childhood; developmental + routine |
| **Cerebral palsy** | ~17k participants | High physical needs: transfers/hoist, dysphagia, continence, pressure care, AAC, sometimes seizures/enteral |
| **Psychosocial disability** | significant | Mental-health monitoring, medication/PRN, sleep, risk |
| **Acquired brain injury (ABI)** | — | Behaviour, seizures, mobility, cognition/communication, continence |
| **Spinal cord injury** | — | Transfers, pressure care/skin, catheter + complex bowel care, autonomic dysreflexia, respiratory (high lesions) |
| **Multiple sclerosis (MS)** | — | Mobility, fatigue, continence, later dysphagia, pain, mood |
| **Motor neurone disease (MND)** | — | Progressive: dysphagia/enteral, ventilation, AAC, transfers, pressure care |
| **Down syndrome** | — | Mealtime, behaviour, medication, hearing/vision, sometimes dysphagia |
| **Epilepsy** | — | Seizure management (core) |
| **Muscular dystrophy** | — | Mobility, respiratory, pressure care, later dysphagia |
| **Younger-onset dementia** | — | Orientation, wandering/absconding risk, mealtime, continence, sleep, behaviour |
| **Sensory — vision / hearing / deafblind** | — | Communication, sensory/environment supports |
| **Prader-Willi syndrome** | — | Food security / hyperphagia (food-access controls), weight, behaviour |
| **Other neurological / physical** | — | Mixed |

Sources: [NDIS list of disabilities (care decisions summary of NDIS data)](https://caredecisions.com.au/ndis-list-of-disabilities/), [NDIS participant data](https://www.ndis.gov.au/news/9601-participant-dashboard-updates).

**Takeaway for the product:** a flat list of ~hundreds of diagnoses is the wrong index.
The *functional support needs* below recur across many conditions and are a small,
maintainable set.

---

## 2. Functional support needs (the recurring axes)

The NDIS Quality & Safeguards Commission's **High Intensity Daily Personal Activities**
supplementary module and **High Intensity Support Skills Descriptors** define the
complex supports that carry specific training, monitoring and recording obligations.
The confirmed high-intensity set:

- **Complex bowel care**
- **Enteral feeding & management** (PEG/PEJ/NG)
- **Severe dysphagia management** (mealtime/swallowing)
- **Tracheostomy management**
- **Urinary catheter management** (indwelling / intermittent)
- **Ventilator management**
- **Subcutaneous injections**
- **Complex wound management**
- **High risk of seizure / epilepsy management**

Sources: [Supplementary module: High intensity daily personal activities (NDIS Q&S Commission)](https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards/supplementary-module-high-intensity-daily-personal), [High Intensity support skills descriptors (PDF)](https://www.ndiscommission.gov.au/sites/default/files/2024-09/High%20Intensity%20support%20skills%20descriptors.pdf).

Plus the **everyday (non-high-intensity) but recordable** support needs that drive most
shift logging:

- **Mobility & transfers** (hoist, slide-sheet, 1-/2-person assist) + **repositioning / pressure-injury prevention**
- **Skin integrity** monitoring
- **Continence support** (aids, toileting routine, bowel chart)
- **Mealtime management & texture-modified diet / thickened fluids** (IDDSI)
- **Communication** (non-verbal / AAC)
- **Behaviour support plans & restrictive practices**
- **Medication / PRN** administration & effect
- **Mental-health / psychosocial** monitoring (mood-safety, risk, sleep)
- **Diabetes** (BGL, hypo/hyper signs)
- **Pain** (incl. non-verbal pain indicators)
- **Sensory / environmental** supports
- **Hydration / fluid balance** & **nutrition / weight** monitoring
- **Food security** (Prader-Willi hyperphagia controls)

### Mealtime / dysphagia — IDDSI
Texture-modified diets and thickened fluids follow the **IDDSI** framework — a continuum
of levels 0–7: **drinks 0–4** (0 Thin, 1 Slightly thick, 2 Mildly thick, 3 Moderately
thick, 4 Extremely thick) and **foods 3–7** (3 Liquidised, 4 Pureed, 5 Minced & moist,
6 Soft & bite-sized, 7 Regular / Easy-to-chew). Recording the exact level matters for
aspiration safety. Source: [IDDSI framework (iddsi.org)](https://www.iddsi.org/standards/framework).

### Behaviour support & restrictive practices
Participants with a **behaviour support plan (BSP)** may have **regulated restrictive
practices** — the five types are **seclusion, chemical, mechanical, physical, and
environmental restraint**. Implementing providers must **record every use** of a
regulated restrictive practice, submit **monthly RP reports**, and lodge a
**reportable incident** for any unauthorised/unplanned use (within 5 business days).
This makes structured behaviour + RP capture a compliance requirement, not a nicety.
Source: [Behaviour support and restrictive practices (NDIS Q&S Commission)](https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices).

---

## 3. What a worker records per support need (→ chips/observations)

The data points below are what map onto capture chips, sub-chips, and observation fields.

| Support need | Data points to capture on shift |
|---|---|
| **Seizure / epilepsy** | time, **type** (tonic-clonic/absence/focal…), **duration**, warning/aura, injury, **rescue medication given** (e.g. midazolam) + time, **post-ictal** recovery, ambulance/escalation |
| **Enteral / PEG feeding** | feed name/formula, **volume & rate**, **water flushes** (mL), pump vs bolus, **stoma/site check** (clean/red/leak), position (≥30–45°), tolerance (nausea/reflux), residual |
| **Dysphagia / thickened fluids** | **IDDSI fluid level** (0–4), **IDDSI food level** (3–7), supervision/positioning, pacing, coughing/choking, aspiration signs, amount taken |
| **Mealtime management** | meal, **amount eaten**, assistance level, texture as above, fluids, choking/refusal |
| **Mobility & transfers** | transfer method (**hoist / slide-sheet / 1- or 2-person**), equipment used, falls/near-miss |
| **Repositioning / pressure care** | **position** (left/right/back/chair), **time** (e.g. 2-hourly), skin at pressure points |
| **Skin integrity / wounds** | site, **observation** (intact / redness / bruise / skin tear / rash / **pressure area / wound**), dressing changed, photo |
| **Continence** | **type** (urine/bowel/both), **Bristol** (bowel), **bowel amount**, **aid changed**, **pad check**, catheter care, accidents |
| **Complex bowel care** | last bowel motion / **days since BM**, aperients given, result, abdominal discomfort (anti-impaction routine) |
| **Catheter** | type (IDC/intermittent), output volume/colour, site, leakage, blockage |
| **Behaviour (BSP)** | **antecedent → behaviour → consequence (ABC)**, duration/intensity, strategy used, **restrictive practice used?** (type, duration, authorised?), injuries → links to reportable incident |
| **Medication / PRN** | status (given/witnessed/PRN/refused/missed), dose, **PRN effect** (effective/partial/none), refusal reason |
| **Mental health / psychosocial** | mood-safety/risk observations (factual), engagement, sleep, PRN, escalation |
| **Diabetes** | **BGL reading** + time, hypo/hyper signs, insulin/medication, food/fluid |
| **Pain** | site, severity (or non-verbal indicators), action taken, effect |
| **Respiratory / tracheostomy / ventilation** | suctioning, secretions, O₂ sats, vent settings/alarms, trache site |
| **Communication / AAC** | method used (device/signs/cues), participation/engagement |
| **Hydration / fluid balance** | fluid **in** (mL) and where relevant **out** (mL), totals |
| **Nutrition / weight** | weight, intake adequacy |
| **Food security (Prader-Willi)** | food access controlled, attempts to seek food, weight |
| **Sensory** | sensory aids used, environment adjustments, distress triggers |

Anchored in the [High Intensity support skills descriptors](https://www.ndiscommission.gov.au/sites/default/files/2024-09/High%20Intensity%20support%20skills%20descriptors.pdf), [NDIS Practice Standards & Quality Indicators](https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf), [IDDSI](https://www.iddsi.org/standards/framework), and [behaviour support / restrictive practices rules](https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices).

---

## 4. ACTIONABLE MAPPING — support-need flags → chips

### 4a. The support-need flag catalogue
Each flag is a boolean (or small enum) on a participant's care profile. When set, it
turns on the listed chip(s)/observation group(s). Existing Caira categories are marked
**[exists]**; ones we'd add are **[new]**.

| Flag | Switches on | Notes |
|---|---|---|
| `mealtime` (default on) | **Food** [exists] | Universal |
| `hydration` (default on) | **Drink** [exists] (mL) | Universal; `fluid_balance` adds in/out totals |
| `dysphagia` | Drink → **IDDSI fluid level (0–4)**; **Food** → **IDDSI food level (3–7)** + supervision/choking obs | Replaces the simple Thin/Thickened toggle with IDDSI levels |
| `enteral_feeding` | **Feed/PEG** [new] (formula, volume, flush mL, site check, position, tolerance) | Often pairs with `dysphagia`; may suppress oral Food |
| `seizures` | **Seizure** [new] (type, duration, rescue med, post-ictal) within a **Health/Observation** category | High-intensity |
| `continence` | **Toilet** [exists] obs/aids enabled | |
| `complex_bowel_care` | Toilet → **bowel chart** (Bristol [exists], days-since-BM, aperient, result) | Anti-impaction routine |
| `catheter` | Toilet → **catheter** fields (output, site, leakage) | |
| `mobility_transfer` | **Transfer** [new] (method: hoist/slide-sheet/1–2 person, equipment, falls) | |
| `pressure_care` | **Repositioning** [new] (position, time, pressure-point skin) | 2-hourly turns |
| `skin_integrity` | **Hygiene → skin check** [exists] emphasised; **Wound** [new] for active wounds | |
| `behaviour_support_plan` | **Behaviour** [new] (ABC, strategy, intensity) | Factual ABC only |
| `restrictive_practices` | Behaviour → **RP-used** fields (type, duration, authorised) + reportable-incident link | Compliance-critical |
| `medication` (default on) | **Meds** [exists] (+ PRN effect [exists]) | |
| `psychosocial` | **Mental-health/mood-safety** observation (factual) + sleep + PRN | |
| `diabetes` | **BGL** [new] (reading, hypo/hyper, insulin) within Health/Observation | |
| `pain` | **Pain** [new] obs (site, severity / non-verbal indicators, action, effect) | |
| `respiratory` / `tracheostomy` / `ventilation` | **Respiratory** [new] (suction, sats, settings) | High-intensity |
| `communication_aac` | **Communication** [new] / Activity → engagement [exists] | |
| `sleep_monitoring` | **Sleep** [exists] | Overnight/SIL |
| `nutrition_weight` | **Weight** [new] + Food intake emphasis | |
| `food_security` | Food-access control prompts (Prader-Willi) | Specialised |
| `sensory` | Sensory-support notes | |

### 4b. Condition → suggested flags (the auto-suggest defaults)
Tagging a condition pre-selects these flags; the coordinator then edits per participant.

| Condition tag | Suggested flags (editable) |
|---|---|
| **Autism** | `behaviour_support_plan`, `communication_aac`, `sensory`, (medication) |
| **Intellectual disability** | `behaviour_support_plan`, `medication`, `mealtime`, (`continence`) |
| **Cerebral palsy** | `mobility_transfer`, `pressure_care`, `dysphagia`, `continence`, `communication_aac`, (`seizures`, `enteral_feeding`, `pain`) |
| **Acquired brain injury** | `behaviour_support_plan`, `seizures`, `mobility_transfer`, `continence`, `communication_aac`, `psychosocial` |
| **Spinal cord injury** | `mobility_transfer`, `pressure_care`, `skin_integrity`, `catheter`, `complex_bowel_care`, (`respiratory`) |
| **Multiple sclerosis** | `mobility_transfer`, `continence`, `pain`, `psychosocial`, (`dysphagia`) |
| **Motor neurone disease** | `dysphagia`, `enteral_feeding`, `respiratory`/`ventilation`, `communication_aac`, `mobility_transfer`, `pressure_care` |
| **Down syndrome** | `mealtime`, `behaviour_support_plan`, `medication`, (`dysphagia`, `sensory`) |
| **Epilepsy** | `seizures` |
| **Muscular dystrophy** | `mobility_transfer`, `respiratory`, `pressure_care`, (`dysphagia`) |
| **Younger-onset dementia** | `psychosocial`, `behaviour_support_plan`, `continence`, `mealtime`, `sleep_monitoring`, wandering/absconding risk |
| **Psychosocial disability** | `psychosocial`, `medication`, `sleep_monitoring`, (`behaviour_support_plan`) |
| **Vision / hearing / deafblind** | `communication_aac`, `sensory` |
| **Prader-Willi syndrome** | `food_security`, `nutrition_weight`, `behaviour_support_plan` |

### 4c. How this lands in the data model (for the design step)
- A `ParticipantCareProfile`: `conditions[]` (tags) + `supportNeeds[]` (the resolved
  flags, editable) + optional per-flag config (e.g. IDDSI levels, repositioning
  interval).
- Condition tags only **seed** the flag set (a suggestion); flags are the truth.
- The capture grid computes visible categories/sub-groups = **base universal set ∪
  flag-enabled set**, with `showWhen` reused for conditional sub-groups (it already
  drives Bristol/PRN-effect).
- This composes with the **sector-configurable categories** idea (sector sets the
  baseline; participant flags refine it).
- High-intensity flags (`enteral_feeding`, `seizures`, `complex_bowel_care`,
  `catheter`, `respiratory`/`tracheostomy`/`ventilation`) should also gate on worker
  competency later (training/credential check) per the high-intensity descriptors.

---

## Sources
- NDIS Q&S Commission — [High intensity daily personal activities (supplementary module)](https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards/supplementary-module-high-intensity-daily-personal)
- NDIS Q&S Commission — [High Intensity support skills descriptors (PDF)](https://www.ndiscommission.gov.au/sites/default/files/2024-09/High%20Intensity%20support%20skills%20descriptors.pdf)
- NDIS Q&S Commission — [NDIS Practice Standards & Quality Indicators (PDF)](https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf)
- NDIS Q&S Commission — [Behaviour support and restrictive practices](https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices)
- IDDSI — [The IDDSI framework](https://www.iddsi.org/standards/framework)
- NDIS — [Participant data / dashboard](https://www.ndis.gov.au/news/9601-participant-dashboard-updates) · [List of disabilities summary](https://caredecisions.com.au/ndis-list-of-disabilities/)

*Method note: the deep-research workflow harness errored mid-run (structured-output
retry cap); this report was compiled from direct searches of the official sources above
plus domain knowledge. Treat the flag→chip wording as a first draft for clinical review.*
