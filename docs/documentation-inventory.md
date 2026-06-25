# Caira — Documentation & policy inventory (per page / per scope)

A review of every page/surface (see `docs/design/information-architecture.md`) for the
**documentation that must be inserted** — split into **General** (platform-wide),
**Organisation-specific**, and **User-specific**. Plus the **in-page disclaimers/notices**
that are legally important even though they live inside functional screens.

Status: `[exists]` built · `[draft]` started (e.g. privacy) · `[new]` needs writing.
Companion: `Caira — Legal & Compliance (Consolidated)` (Drive) lists the *mandatory*
compliance docs; this maps them to pages and adds the operational/help docs around them.
Nothing here is legal advice — the NDIS-specialist session signs these off.

---

## 1. General documentation (platform-wide, mostly public)

Reachable from the footer on **every** page; gate = public.

| Doc | Where | Status | Notes |
|---|---|---|---|
| Privacy Policy | `(public)/privacy` | [draft] | Must detail: AI/LLM note-processing, localised PII scrubbing, possible cross-border hosting (APP 8), data residency (Sydney), no-AI-training, retention, erasure. Needs legal review. |
| Terms of Service (general/site) | `(public)/terms` | [new] | Site use, accounts, acceptable use, liability, governing law (NSW/Australia). |
| Provider Terms / MSA (B2B) | `(public)/terms#providers` or `/terms-providers` | [new] | SaaS boundary, "not a plan-management/financial advisor", funding-rejection disclaimer, payment terms, seats. |
| Data Processing Agreement (DPA) | `(public)/dpa` | [new] | Caira = processor, provider = controller; sub-processor list; security measures; breach notification. |
| Sub-processor list | `(public)/dpa#subprocessors` | [new] | Supabase (AWS Sydney), Google Gemini, Resend, Vercel, Stripe, PostHog, Sentry — purpose + region each. |
| AI / Automated-processing disclosure | `(public)/security` or `/ai` | [new] | What the AI does, what it never does (no clinical decisions), human-in-the-loop, scrubbing, no training. |
| Security & data-residency statement | `(public)/security` | [new] | Encryption at rest, RLS/tenant isolation, AU residency, audit trail, access controls. |
| Accessibility statement | `(public)/accessibility` | [new] | WCAG target, contact for issues (sector relevance). |
| Cookie / tracking notice | banner + `/privacy#cookies` | [new] | PostHog/analytics consent; essential vs optional. |
| Complaints & feedback policy | `(public)/complaints` or help | [new] | How to raise/escalate; NDIS-sector expectation. |
| Status / uptime | `(public)/status` | [new] | Backed by `/api/health`. |
| Changelog / "What's new" | modal + `/changelog` | [new] | Release notes; `lastSeenVersion`. |
| Help centre / FAQ (public) | `(public)/help` | [new] | Pre-sales + general FAQ (security, NDIS, pricing). |
| Contact / support | footer + `/contact` | [new] | Support email, business details, ABN (once registered). |

---

## 2. Organisation-specific documentation (per provider; in the console)

Generated/stored per organisation; gate = org capabilities.

| Doc | Where | Status | Notes |
|---|---|---|---|
| Org onboarding / setup guide | `console` onboarding | [new] | Wizard + help: create org, seats, first participant, roles. |
| Admin / coordinator handbook | `console/help` | [new] | Rostering, approvals, incident workflow, audit export, settings. |
| Signed Provider Agreement + DPA (record) | `console/settings/legal` | [new] | The org's accepted ToS/DPA version + date (acceptance log). |
| NDIS compliance pack | `console/reports` / `console/help` | [new] | How Caira supports practice standards, audit-trail export, incident reporting. |
| Incident-reporting procedure | `console/incidents/help` | [new] | Mandatory NDIS fields, who-to-notify, reportable-incident timelines (5 business days). |
| Data-breach response plan (org view) | `console/settings/legal` | [new] | Notification steps; ties to platform breach plan. |
| Restrictive-practices / behaviour-support guidance | `console/help` | [new] | Recording RP use, monthly reporting expectation (links the Behaviour chip). |
| Audit-trail export & retention policy | `console/audit` | [new] | What's logged, how to export, retention (7-year min). |
| Roles & access policy (org) | `console/team/help` | [new] | What each seat can do; how to grant family/guardian access. |
| Billing terms / invoicing & GST | `console/billing` | [new] | Plan, seats, GST, invoices, dunning. |
| Org data & branding settings doc | `console/settings` | [exists, expand] | Sector mode, capture defaults (auto-suggest cap), retention, integrations. |

---

## 3. User-specific documentation (per person/role)

### Front-line worker
| Doc | Where | Status |
|---|---|---|
| Worker onboarding / quick-start | `(protected)` first-run + `/help` | [new] |
| How to write a good shift note (guide) | `/help` | [new] (overlaps the lead-magnet PDF) |
| Acceptable-use & confidentiality acknowledgement | `account` (accept on first login) | [new] |
| Credential / competency attestations | `account/credentials` | [new] (high-intensity gating, future) |
| Personal data & privacy (worker) | `account` | [new] |

### Participant
| Doc | Where | Status |
|---|---|---|
| Participant privacy notice (plain English / Easy Read) | `portal` first view | [new] |
| What Caira is / how your information is used | `portal/help` | [new] |
| How to give feedback / make a complaint | `portal` | [new] |
| Request my data / erasure | `portal/account` | [new] |

### Family carer / Guardian (participant-grant)
| Doc | Where | Status |
|---|---|---|
| Family/guardian access notice (what you can see/do) | `portal/.../people` | [new] |
| Dual-Role Authority-to-Access consent form | `portal/.../consent` | [new] — the worker-AND-family case; legally distinct instrument |
| Consent management guide (guardian) | `portal/.../consent/help` | [new] |
| Medication/routine submission guidance (carer) | `portal/.../updates` | [new] |

---

## 4. In-page notices / disclaimers (documentation embedded in functional pages)

These are short but legally/operationally important; they belong on the screens, not just the policy pages. (Wording for cd to place; logic/flags can be wired by CC.)

- **AI note generation / extraction** — "AI-assisted — review and confirm before saving. Caira does not make clinical decisions." (on generate + on the extract→review screen).
- **Capture screen** — factual-only reminder; "details are kept private and scrubbed before any AI step."
- **Note approval** — "By approving you confirm this reflects the support provided."
- **Incident flag** — pointer to the mandatory-fields requirement + reportable-incident timeline.
- **Restrictive practice recorded** (Behaviour chip) — "Recorded use may require reporting per the participant's behaviour support plan."
- **Login / first run** — link to privacy notice; consent checkpoint.
- **Family/guardian submit (med/routine)** — "This update is flagged to the provider's staff; it does not replace clinical direction."
- **Export / PDF** — "De-identify where required before sharing externally."
- **Soft-release / dummy data** — current footer "Development build · sample data only" (keep until real launch).
- **Cookie/analytics banner** — consent before non-essential analytics fire.
- **Every page footer** — Privacy · Terms · (Contact) links.

---

## 5. Priority for first real users (the gate)
Before any real participant data (hard rule), the minimum doc set is:
1. Privacy Policy (finalised), 2. Provider ToS, 3. DPA + sub-processor list,
4. Dual-Role Authority-to-Access consent form, 5. Participant privacy notice (Easy Read),
6. Data-breach response plan, 7. the AI-disclaimer in-page notices.
Everything else (help/handbooks/changelog) can follow.

*Authoring split: legal/policy wording → NDIS lawyer + Edward; help/onboarding copy →
product; in-page disclaimer placement → cd (design); flags/gating to show them → CC.*
