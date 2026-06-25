# Care & community-services dashboards — feature & info inventory (AU + USA)

Research of common mobile / tablet / desktop dashboards in disability + home/community
care, AU and USA, distilled into the **features and information users may want** — by
surface and user type. For product/IA reference (composes with
`docs/design/information-architecture.md`). Marks **[have]** / **[partial]** / **[gap]**
against Caira today.

Products surveyed — AU: ShiftCare, CareMaster, Lumary, SupportAbility, CTARS, Brevity,
Lookout, VisiCase, FlowLogic, Effica, Orangised. USA: AlayaCare, WellSky Personal Care,
AxisCare, CareSmartz360, Therap, HHAeXchange, Alora, ClearCare. (Sources at end.)

---

## 1. Worker / caregiver — mobile app
Features:
- Clock on/off with **GPS + EVV** (Electronic Visit Verification — US Medicaid mandate); client signature capture. **[partial]** (clock on/off yes; GPS/EVV/signature gap)
- Today's schedule: assigned shifts, **open/offered shifts** (accept/decline), travel/next visit. **[partial]**
- Visit/progress notes — quick structured + free text, **voice-to-text dictation**, **AI note assist**. **[have]**
- Care plan + **task/ADL checklist** for the visit (tick off tasks done). **[gap — tasks/ADL checklist]**
- Client/participant info at hand: key info, allergies, **medications/eMAR**, behaviour/support plan, goals, key contacts, access notes. **[partial]** (care profile yes; eMAR/med admin gap)
- Incident reporting (mandatory fields, photos). **[partial]**
- Mileage / expenses / timesheet capture. **[partial — IA only]**
- Messaging with the agency/coordinator; shift handover. **[gap]**
- **Offline mode** with auto-sync on reconnect. **[gap]**
- Document/photo capture + attach (incl. photograph a doc → text). **[have — logic]**

Info they want: who/where/when of the next visit; what supports are funded; what to do
(tasks/goals); safety flags; how to log it fast; "am I clocked on / paid for this".

## 2. Tablet — shared / group-home "today board"
- At-a-glance status per resident (on shift, meds due, incidents, last activity). **[have — design]**
- One-tap log / open per person; shared voice capture → attribute to a person. **[have — design]**
- Handover / shift-change summary; tasks due this shift. **[gap — handover]**
- Meds round view (who's due, witnessed). **[gap]**

## 3. Coordinator / manager — desktop console + KPIs
Features:
- Live ops dashboard: **who's on shift now**, late/missed clock-ins, **open/unfilled shifts**, incidents needing review, meds due, credential/expiry alerts, payments follow-up. **[partial — mock]**
- Rostering/scheduling: drag-drop, recurring supports, availability, allocate/offer/cancel, conflict + award/overtime checks. **[partial — actions exist]**
- Participant records: profile, NDIS plan, funding/budget tracking, care plan, documents, access grants. **[partial]**
- Notes oversight + **supervisor approval** workflow; full-text search. **[partial]**
- Incident register + reportable-incident workflow + trends. **[gap]**
- Compliance: practice-standard checks, audit trail/export, restrictive-practice register + monthly reporting. **[partial — audit log have]**
- Team/HR: workers, roles/seats, **credential & training expiry tracking**. **[gap]**
- Reporting/analytics + exports (PDF/CSV). **[gap]**

KPIs users want: utilisation/occupancy, unfilled-shift rate, visits completed vs scheduled,
notes-on-time %, incidents by type/severity, budget burn vs NDIS plan, churn/retention,
credential-compliance %, missed-clock-in rate, revenue/claims status.

## 4. Family / participant portal
- **Live care feed**: what happened, when, by whom (read-only). **[have — roster + feed logic]**
- Upcoming **roster of supports** (who's coming, when). **[have — logic]**
- Goals & progress toward them; shared reports/documents. **[partial]**
- Messaging / feedback to the provider; consent management (guardian). **[partial — consent logic]**
- Submit updates (medication/routine) flagged to staff (family carer). **[have — logic]**
- Easy-Read / accessible + **voice** interaction. **[have — assistant logic]**

Info they want: "is someone coming, who, when?", "what happened today?", "is my/their
plan/budget on track?", "how do I raise something?".

## 5. Cross-cutting (all surfaces)
- EVV + geolocation + signatures (US Medicaid; AU verification). **[gap]**
- Offline-first + sync; idempotency. **[partial — idempotency have, offline gap]**
- Notifications/alerts (shift, meds due, incident, approval, expiry). **[gap]**
- AI: note generation, clarifying prompts, the assistant ("ask anything"). **[have]**
- Billing/claims: **NDIS claims/price-guide (AU)** · **multi-payer/Medicaid + EVV (USA)**. **[gap]**
- Security/compliance: tenant isolation/RLS, audit trail, consent, data residency, HIPAA(US)/Privacy Act+APP(AU). **[have/partial]**
- Branding/sector configurability. **[partial — sectorConfig]**

## 6. AU vs USA differences worth designing for
- **AU/NDIS:** NDIS plan + funding categories + budget tracking; price-guide line items & claims; NDIS Practice Standards + Q&S Commission reportable incidents + restrictive-practice reporting; participant/guardian/nominee model.
- **USA/home care:** **EVV is a hard Medicaid mandate** (GPS + verified visits, 45+ state integrations); multi-payer billing + authorizations; HIPAA; aide tasks/ADLs + plan-of-care compliance; state-specific rules.
- Implication: keep **sector/region behaviour configurable** (price guide vs payer rules; reportable-incident vs EVV) — don't hardcode.

## 7. Biggest gaps vs the field (candidate roadmap, not commitments)
1. **Tasks/ADL checklist per visit** (very common; we have categories but not a "plan → tick tasks done").
2. **Medication management / eMAR** (due/witnessed/PRN with an admin record).
3. **EVV + GPS + signature** (table stakes for US; useful verification for AU).
4. **Offline mode** (caregivers work in low-signal homes).
5. **Notifications/alerts** engine.
6. **Incident register + reportable workflow** (beyond a single incident entry).
7. **Credential/training expiry tracking** (also feeds high-intensity competency gating).
8. **Funding/budget tracking + claims/billing** (AU price guide / US payer).
9. **Reporting/analytics + exports**.

## Sources
- AU: [ShiftCare NDIS](https://shiftcare.com/solutions/ndis-providers-software) · [CareMaster features](https://caremaster.com.au/post/ndis-software-features-for-effective-people-management) · [CTARS](https://ctars.com.au/ndis-client-management-software/) · [FlowLogic — best NDIS software 2026](https://flowlogic.com.au/blogs/best-ndis-software/) · [VisiCase](https://visicase.com/solutions/ndis/) · [Effica](https://effica.com.au/)
- USA: [AxisCare — best home care software 2026](https://axiscare.com/blog/best-home-care-software-2026/) · [AxisCare caregiver app](https://axiscare.com/features/caregiver-mobile-app/) · [CareSmartz360 caregiver app](https://www.caresmartz360.com/features/caregiver-mobile-app/) · [CareSmartz360 top software](https://www.caresmartz360.com/blog/home-care/top-10-best-home-care-software/) · [HHAeXchange+ mobile](https://www.hhaexchange.com/solutions/providers/mobile-app) · [Alora](https://www.alorahealth.com/top-8-best-home-care-software-in-2026/)

*Method: direct web search of current AU/US vendor material, distilled. Not exhaustive;
a basis for prioritisation, not committed scope.*
