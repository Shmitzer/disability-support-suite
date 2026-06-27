# Medication Visual Verification + Authorisation — feature spec (Phase H candidate)

**Status:** decisions locked by Edward 2026-06-27 (voice session). Dummy data only — this whole
feature sits **behind the legal gate** (medication + chemical restraint + guardian authorisation +
NDIS Commission). Nothing real until the lawyer + behaviour-support practitioner clear it.

> **Safety framing (non-negotiable):** the AI visual check is **decision-support, not a clinical
> control**. It never administers, never auto-proceeds, and never replaces the worker's own
> medication check or the prescriber's MAR. A wrong "match" could harm someone, so the system is
> built to fail *safe* (low confidence → treated as a mismatch) and to keep a human explicitly in
> the loop on every administration.

---

## 1. Visual medication verification

A worker photographs the pills prepared for a participant; Caira compares the image to the
participant's **active** medication schedule + known pill appearance and either confirms or flags.

**Flow:** open the participant's med-admin screen → Caira shows what's *scheduled* (name, dose, form,
time window) → worker captures a photo **in-app** (not from camera roll — chain of custody) → Claude
Vision (via `src/lib/ai.ts`) compares against the expected profile → one of:
- **Match** → green confirm; worker proceeds; event auto-logged with the photo attached.
- **Mismatch / low confidence** → red alert showing *expected vs seen*; worker must **explicitly
  confirm an override with a typed or dictated reason** before proceeding (one-tap dismissal is not
  allowed). Low-confidence results default to this path.

**AI implementation:** Claude Vision through the existing `src/lib/ai.ts` seam (Rule: all LLM calls
go through it). Send the captured image + a **structured** prompt carrying the *expected medication
profile only* — **not** the participant's name/NDIS number (Rule: scrub PII before any external API).
Model returns a structured `{match: bool, confidence, reasoning, observed}` result; the app — not the
model — decides the outcome, and confidence below a threshold is forced to the mismatch path.

## 2. Authorisation workflow — hard-gated state machine

No medication profile and no restrictive-practice plan can be **ACTIVE** until every required layer
has signed off. These are **DB-enforced gates**, not UI checkboxes — enforce via a status enum so a
direct data write can't skip a stage:

```
DRAFT → PENDING_BSP → PENDING_COMMISSION → PENDING_GUARDIAN → ACTIVE
                                        ↘ DECLINED (locks the record, notifies coordinator)
```

- **DRAFT** — coordinator/admin creates the draft record.
- **PENDING_BSP** — Behaviour Support Practitioner sign-off (required for any restrictive practice);
  in-platform or a tracked external approval reference.
- **PENDING_COMMISSION** — for regulated restrictive practices, the NDIS Quality & Safeguards
  Commission registration + **authorisation reference number** recorded before active.
- **PENDING_GUARDIAN** — nominated guardian/family give **explicit in-platform confirmation** (a
  required approval *action* with timestamp + identity, not a passive notification). Decline → record
  locks, coordinator notified immediately.
- **ACTIVE** — only now does it appear in a worker's shift view / become actionable.

**Until ACTIVE, workers see nothing** — the record is pending/draft, visible to coordinators/admins only.

**Guardian/family confirmation:** nominated contact gets a notification (email/SMS or in-app) with a
secure link → reviews the plan in **plain language, not clinical jargon** → confirms or declines with a
recorded reason. Their pathway is **read + confirm only**.

**Role permissions:**
- **Support workers** — cannot create/edit/view pending med or RP records; only act on ACTIVE ones.
- **Care coordinators** — create/manage drafts; see authorisation status.
- **Admins** — full access + the full authorisation-chain audit trail.
- **Guardians/family** — read + confirm only, via their own access pathway.

## 3. Medication reference database — phased

- **Phase 1 (now):** Caira's **own internal** reference DB. Pill appearance — **structured fields**
  (colour, shape, size, markings, identifying features), *not* a free-text blob — entered manually per
  medication at profile setup, with an optional reference photo. Grows over time.
- **Phase 2 (post-revenue):** integrate a licensed external reference (e.g. **MIMS Australia**, API is
  licensed). **Design now so it slots in as a data source** without touching the AI comparison layer —
  the structured appearance fields make the MIMS mapping a clean exercise, not a rebuild.

## 4. Data model implications

- **Medication** (per participant): name, dose, frequency, route, prescribing details; authorisation
  `status` enum (above); links to authorisation records.
- **PillAppearanceProfile**: structured colour / shape / size / markings / features (+ optional photo);
  source = `INTERNAL` now, `MIMS` later.
- **MARLog** (administration record): timestamp, workerId, photo, AI result (match/confidence/reasoning),
  outcome (`CONFIRMED` | `OVERRIDDEN`), override reason if any. **Immutable once submitted** — no edits.
- **Authorisation records**: per-stage approver identity + timestamp + reference numbers (BSP, Commission),
  guardian confirmation event. Immutable audit chain.
- **Chemical-restraint link**: when a med is a chemical restraint (e.g. Zef's Lorazepam PRN), the MAR
  event cross-references the **restrictive-practice** record + is **reportable** (ties into the existing
  `Incident` RP fields + `medicationAdminId`).

## 5. Compliance + design constraints (hard)

- Photo captured **in-app only** (chain of custody) — never uploaded from camera roll.
- Override requires a **typed or dictated reason**; one-tap dismissal insufficient.
- MARLog + authorisation chain are **immutable** post-submit.
- AI result is advisory; the worker always makes the final administration decision.
- Supports NDIS Q&S Commission requirements for restrictive-practice documentation (photo + AI result +
  confirmation all stored against the event).

## 6. Open / Edward-gated before build-for-real

- Lawyer + BSP confirm: RP reporting obligations, the authorisation chain's legal sufficiency, guardian
  confirmation as a valid consent record, and AI-assisted verification liability framing.
- NDIS Commission registration field + reference-number format.
- Guardian/family external access pathway (auth + scoping) — extends the existing `ParticipantAccessGrant`/
  `Consent` model.
- MIMS licensing (Phase 2).
- AI confidence threshold + the exact structured vision prompt (decision-support tuning).

## 7. Build split (when sequenced)

- **cc:** the `status` state-machine + gate enforcement (DB-level, not UI), Medication/PillAppearance/
  MARLog schema as **unapplied `prisma/sql`**, the Claude-Vision verification behind `src/lib/ai.ts`
  (PII-scrubbed, app-side outcome decision, fail-safe on low confidence), guardian-confirmation +
  authorisation actions, immutable audit, RP/chemical-restraint linkage.
- **cd:** med-admin + visual-verification screens (capture, match/mismatch states, override-with-reason),
  the coordinator authorisation-status + draft screens, and the guardian plain-language review/confirm
  surface. Design SSOT first (`.dc.html` + HANDOFF), then cc wires.
