# Pre-launch documentation checklist (gate before any real participant data)

The minimum legal/compliance documentation that MUST be done before the first real
participant data enters Caira (the hard rule). Derived from `docs/documentation-inventory.md`
§5 and the `Caira — Legal & Compliance (Consolidated)` doc (Drive). Tick as completed.

Status key: ☐ not started · ◐ in progress · ☑ done
Owner key: **L** legal (NDIS lawyer + Edward) · **P** product/copy · **D** cd (design/placement) · **C** Claude Code (logic/gating/page wiring)

> GATE RULE: do not switch off dummy-data / onboard a real participant until every item
> below is ☑. Soft release (dummy data, behind login, allowlist) does NOT require these.

---

## 1. Privacy Policy (finalised)  ☐
- ☐ **L** Finalise wording: AI/LLM note-processing, localised PII scrubbing, cross-border (APP 8), data residency (Sydney), no-AI-training, 7-yr retention, erasure.  *(start from existing `(public)/privacy` draft)*
- ☐ **C/D** Published live at `/privacy`, linked in every footer.
- ☐ **C** Version + effective-date recorded (so acceptance can reference it).
- Depends on: legal session.

## 2. Provider Terms of Service (B2B)  ☐
- ☐ **L** Draft: SaaS boundary, "not a plan-management/financial advisor", funding-rejection disclaimer, payment terms, seats, governing law (NSW).
- ☐ **C/D** Published at `/terms` (provider section), linked in footer + signup.
- ☐ **C** Provider acceptance captured + logged (who/when/version) at org onboarding.

## 3. Data Processing Agreement (DPA) + sub-processor list  ☐
- ☐ **L** Draft DPA: Caira = processor, provider = controller; security measures; breach-notification terms.
- ☐ **P/L** Sub-processor list: Supabase (AWS Sydney), Google Gemini, Resend, Vercel, Stripe, PostHog, Sentry — purpose + region each.
- ☐ **C/D** Published at `/dpa` (+ `#subprocessors`); referenced from Provider ToS.
- ☐ **C** DPA acceptance logged with the provider agreement.

## 4. Dual-Role Authority-to-Access consent form  ☐
- ☐ **L** Draft the instrument separating worker-vs-family access for one person (the NLS/Zef/mother case).
- ☐ **C** Wire to the participant-grant flow (`ParticipantAccessGrant` + `Consent`); store signed consent + timestamp.
- ☐ **D** Place the consent step in `portal/.../consent` (design).
- Depends on: legal confirmation the model is valid.

## 5. Participant privacy notice (plain English / Easy Read)  ☐
- ☐ **P/L** Write Easy-Read "how your information is used" + rights.
- ☐ **C/D** Shown on first portal view; acknowledgement captured.

## 6. Data-breach response plan  ☐
- ☐ **L/P** Document detection → assessment → notification (OAIC NDB scheme) → remediation steps + roles.
- ☐ **C** Internal runbook in `docs/`; org-facing summary in console settings.
- Note: rotate the exposed DB password before go-live (separate ops task).

## 7. AI in-page disclaimers / notices (the embedded docs)  ☐
- ☐ **P** Final copy for each notice.
- ☐ **D** Placement on screens (design).
- ◐ **C** Logic/flags to surface them where conditional. **Resolver done** — `src/lib/notices.ts` (`activeNotices(ctx)`/`shouldShow`, pure + tested); cd consumes the returned keys. Required notices:
  - ☐ AI generate + extract→review: "AI-assisted — review & confirm before saving. No clinical decisions."
  - ☐ Note approval attestation: "By approving you confirm this reflects the support provided."
  - ☐ Incident flag → mandatory NDIS fields + reportable-incident timeline pointer.
  - ☐ Restrictive-practice recorded (Behaviour chip) → reporting reminder.
  - ☐ Family/guardian med/routine submit → "flagged to provider staff; not clinical direction."
  - ☐ Export/PDF → "de-identify where required before sharing externally."
  - ☐ Login/first-run → privacy-notice link + consent checkpoint.

---

## Cross-cutting (do alongside)
- ☐ **C/D** Footer legal links (Privacy · Terms · Contact) on every page.
- ☐ **C** Cookie/analytics consent before non-essential analytics fire (PostHog).
- ☐ **C** Acceptance/consent records are auditable (Rule 9 — `recordAudit`).

## Definition of done (the gate)
All of 1–7 ☑ AND footer links live AND consent/acceptance logged → only then disable
dummy data and onboard a real participant.

*Tracking: tick items here as they complete; legal items block on the NDIS-lawyer session.*
