# Caira — Information Architecture: user types → surfaces → pages

Draft IA for the whole platform. Maps every **user type** to the **surfaces** and **pages
(route sub-folders)** they reach, with a content outline + the **capability** each page
gates on. Authorization is always by capability (`can(principal, Capability.X, resource)`),
never by role literal — see `src/lib/rbac.ts`. `[exists]` = built today, `[new]` = proposed.

---

## 1. User types

**Org-membership roles** (`Role`, scoped to an organisation — `src/lib/rbac.ts`):
- **Front-line worker** — `WORKER` / `SOLO_WORKER` — `ShiftWork`. Works their own shifts, writes the shift log. (Solo = no org.)
- **Supervisor** — `SUPERVISOR` — *seat reserved* (→ `ShiftReadOrg`, `ClockAmend`/approvals). Oversight within the org.
- **Coordinator / Admin** — `ADMIN` — `RosterManage, ClockAmend, BillingManage, ShiftReadOrg, AuditRead, CareProfileManage, OrgSettingsManage`. Runs the org.
- **Participant** — `PARTICIPANT` — *seat reserved*. Self-managed portal (future).
- **Platform admin** — `SUPERADMIN` — internal only; platform override (everything).

**Participant-grant roles** (`GrantRole`, scoped to ONE participant via `ParticipantAccessGrant`):
- **Family carer (clinical)** — `family_carer_clinical` — `NotesRead, MedicationSubmit, RoutineSubmit, HandoverReceive, FeedbackSubmit`. The NLS/Zef/mother case.
- **Guardian** — `participant_guardian` — `NotesRead, RoutineSubmit, HandoverReceive, FeedbackSubmit, ConsentManage`. Decision-maker; no hands-on medication.

**Dual-role principal**: one account can hold BOTH an org role and participant grants
(e.g. Zef's mother = independent `WORKER` + `family_carer_clinical` for Zef). The
`Principal` is the union; the UI must surface both "my work" and "my person" contexts.

---

## 2. Surfaces (top-level route groups)

| Surface | Route group | Primary user types |
|---|---|---|
| Marketing / public | `(public)` | Anyone (logged out) |
| Worker app (mobile-first) | `(protected)` | Front-line worker, dual-role |
| Coordinator console (desktop) | `/console` (today `/admin`) | Coordinator/Admin, Supervisor |
| Participant & family portal | `/portal` | Participant, family carer, guardian |
| Platform admin | `/platform` | SUPERADMIN |
| Auth + API | `auth`, `api` | system |

---

## 3. Route tree (sub-folders) + page contents

### 3a. `(public)` — logged out  [partly exists]
```
(public)/
  page.tsx                 [exists] Landing/sales — hero, problem, how-it-works, benefits,
                                    trust/compliance strip, social proof, pricing teaser,
                                    FAQ, CTA + WaitlistForm. (See sales-page gap notes.)
  pricing/                 [new]    Plans (provider per-seat + family-portal add-on), FAQ, CTA.
  for-providers/           [new]    Agency value prop (rostering, oversight, audit, ROI).
  for-workers/             [new]    Solo/worker value prop (painkiller: less paperwork).
  security/                [new]    Data residency, Privacy Act/APP, PII scrubbing, "no AI training".
  login/                   [exists] Magic-link sign-in.
  privacy/                 [exists] Privacy policy (enterprise draft).
  terms/                   [new]    Provider ToS / participant terms.
```

### 3b. `(protected)` — worker app (mobile-first)  [partly exists]
Gate: signed in + (soft-release) allowlisted. Content = the front-line worker's day.
```
(protected)/
  dashboard/               [exists] Home: current/next/last shift, clock-on, alerts.
  shift/[id]/              [exists] The capture screen — chips (care-profile tailored),
                                    voice, timeline, time confirmation, finish shift. (ShiftWork)
  notes/                   [exists] My progress notes — list, search, filter, PDF export. (ShiftWork)
  shifts/                  [new]    My roster: upcoming, offered (accept/decline), history.
  participants/[id]/       [exists] Participant the worker supports: summary, care plan,
                                    key contacts, care-profile editor (CareProfileManage).
  timesheet/               [new]    Hours + mileage captured as worked; export.
  account/                 [new]    Profile, notifications, credentials (future competency).
  billing/                 [exists] Subscription (solo worker self-serve). (BillingManage)
```

### 3c. `/console` — coordinator/admin (desktop)  [mock exists at `/admin`]
Gate: org-management capabilities. Mirrors the `Caira Tablet & Web.dc.html` designs.
```
console/
  page.tsx                 [mock]   Dashboard: on-shift now, logs today, open incidents,
                                    meds due, needs-attention, recent activity. (ShiftReadOrg)
  participants/            [new]    Roster of participants; open a record.
    [id]/                  [partly] Participant record: profile header, timeline table,
                                    care plan, documents, care-profile (CareProfileManage),
                                    access grants (who can see this person) (ConsentManage).
  shifts/                  [new]    Roster management: create/allocate/offer/cancel,
                                    clock-amendment approvals. (RosterManage, ClockAmend)
  incidents/               [new]    Incident log + reportable-incident workflow. (ShiftReadOrg)
  reports/                 [new]    Oversight & reporting; NDIS audit PDF export. (ShiftReadOrg)
  team/                    [new]    Workers/seats, roles, invitations. (OrgSettingsManage)
  audit/                   [new]    Tamper-evident audit trail viewer + verify. (AuditRead)
  settings/                [exists] Org settings (auto-suggest cap, sector). (OrgSettingsManage)
  billing/                 [new]    Org subscription/seats/invoices. (BillingManage)
```

### 3d. `/portal` — participant & family/guardian  [new]
Gate: participant-grant capabilities, ALWAYS scoped to one participant. Warm, simple, low-literacy-friendly.
```
portal/
  page.tsx                 [new]    "<Name>'s day" — recent care feed (read-only). (NotesRead)
  [participantId]/         [new]    (When a principal covers >1 person, pick one.)
    feed/                  [new]    Notes/handover feed, photos. (NotesRead, HandoverReceive)
    updates/              [new]    Submit medication / routine update → flagged to org staff.
                                    (MedicationSubmit*, RoutineSubmit)  *carer-clinical only
    feedback/              [new]    Leave feedback about supports. (FeedbackSubmit)
    documents/             [new]    Care plan, reports shared with family. (NotesRead)
    consent/               [new]    Guardian: grant/withdraw consent + manage who has access.
                                    (ConsentManage) — guardian only
    people/                [new]    Who supports this person (workers, carers) — read-only.
```
Note: medication submit shows for `family_carer_clinical`; consent shows for `participant_guardian`.

### 3e. `/platform` — SUPERADMIN (internal)  [new]
```
platform/
  orgs/                    [new]    Organisations: list, status, subscription.
  users/                   [new]    Users/seats across orgs; impersonate (audited).
  flags/                   [new]    Feature flags (per org/user).
  metrics/                 [new]    MRR, notes/day, API spend vs cap, error rate.
```

### 3f. `auth` / `api`  [exists]
```
auth/confirm, auth/denied [exists]   Magic-link landing; allowlist-denied page.
api/health, api/transcribe, api/generate-note, api/stripe/webhook  [exists]
```

---

## 4. What a given user actually sees (quick matrix)

| User type | Lands on | Can reach |
|---|---|---|
| Front-line worker | `/dashboard` | shift, notes, shifts, my participants, timesheet, account |
| Coordinator/Admin | `/console` | everything in console + settings + billing + audit |
| Supervisor | `/console` (read) | dashboard, participants, incidents, reports (once capabilities widen) |
| Participant | `/portal` | their own feed, feedback, documents |
| Family carer (clinical) | `/portal/<participant>` | feed, updates (med/routine), handover, feedback |
| Guardian | `/portal/<participant>` | feed, routine, handover, feedback, consent |
| Dual-role (worker + carer) | `/dashboard` + a switcher to `/portal/<participant>` | both contexts |
| SUPERADMIN | `/platform` | platform admin + (audited) impersonation |

---

## 5. Common / cross-cutting pages (need making)

Recurring pages that aren't unique to one surface. Each gates on a capability and reuses
shared components. `[exists]`/`[new]` as before.

**Profile & account** (the signed-in person)
- `account/` `[new]` — name, photo, preferred name, contact, language; **security** (passkey/magic-link, active sessions, sign out everywhere); **notification prefs**; the roles/grants this account holds (read-only); **credentials** (training/competency — future, ties to high-intensity gating); delete/anonymise account (right-to-erasure).

**Settings** (two levels)
- User settings → live under `account/` above.
- Org settings → `console/settings/` `[exists, expand]` — sector mode, branding/logo, capture defaults (auto-suggest cap `[exists]`), data-retention policy, integrations (Stripe, email/Resend, Sentry/PostHog), feature toggles, business details (ABN once registered).

**Documents** (files, scoped by who may see them)
- Participant documents → `console/participants/[id]/documents/` + `portal/.../documents/` `[new]` — care plans, NDIS plan, consent forms, assessments, reports, photos. Upload, categorise, version, set **share scope** (org-only / family / guardian), expiry. Storage = Supabase relative paths (Rule 3).
- Org documents → `console/documents/` `[new]` — policies, templates, induction docs.

**Notifications / activity** — `notifications/` `[new]` — meds due, incidents, handovers, shift offers, approvals; per-channel prefs.

**Search** — global `[new]` — participants, notes (full-text via tsvector), shifts; scoped to what the principal may see.

**Help & support** — `help/` `[new]` — FAQs, contact, report-a-problem; public help under `(public)`.

**Onboarding / first-run** — `[new]` — provider setup wizard (org, seats, first participant), worker first-run (accept invite, first shift), participant/family invite acceptance.

**Billing & invoices** — solo: `(protected)/billing/` `[exists]`; org: `console/billing/` `[new]` — plan/seats, payment method, invoice history, GST. (BillingManage)

**Team & invitations** — `console/team/` `[new]` — workers/seats, roles, invite/revoke, status. (OrgSettingsManage)

**Access & consent** — `console/participants/[id]/access/` `[new]` (who can see this person; grant/revoke) + `portal/.../consent/` `[new]` (guardian grants/withdraws). (ConsentManage)

**Incident detail** — `console/incidents/[id]/` `[new]` — full incident + mandatory NDIS fields + reportable-incident workflow + audit.

**Report / note detail** — `notes/[id]/` `[new]` — a single progress note, edit, supervisor approval, PDF export, provenance.

**Export centre** — `[new]` — NDIS audit PDF, CSV exports; reachable from reports/notes.

**Audit viewer** — `console/audit/` `[new]` — tamper-evident trail + `verifyAuditChain()`. (AuditRead)

**Legal & trust** (public) — `privacy/` `[exists]`, `terms/` `[new]`, `dpa/` `[new]` (provider data-processing agreement), `accessibility/` `[new]`, `security/` `[new]`, `status/` `[new]` (uptime).

**System / state pages** — `not-found.tsx` (404) `[new]`, `error.tsx` (500) `[new]`, offline/PWA fallback `[new]`, `auth/denied` `[exists]`, "what's new"/changelog modal `[new]`.

---

## 6. Participant record — canonical contents (the central object)

The participant record is reused by the worker app, console, and portal (each shows the
slice its capabilities allow). One canonical content set (fields from the Master Tech
Spec Participant model + `care-needs.ts`):
- **Identity**: first/last/preferred name, photo, DOB, pronouns, language.
- **NDIS**: NDIS number, plan start/end, funding categories, support goals, primary + secondary disability.
- **Care profile** (`care-needs.ts`): condition tags → support-need flags (drives capture chips); IDDSI levels; repositioning interval. (CareProfileManage to edit.)
- **Support needs**: communication needs / AAC, behaviour support plan flag, medication-managed flag, high-intensity supports (with worker-competency gating, future).
- **Contacts**: guardian/nominee, next of kin, GP, coordinator, emergency contacts.
- **Care plan & documents**: current plan, attached files (see Documents).
- **Timeline**: chronological logs/notes (read scope by capability).
- **Access grants**: who can see this person (workers, family carer, guardian) + consent state.
- **Audit**: every change recorded (Rule 9).

Surfacing rules: worker sees the support-relevant slice for people they're rostered to;
coordinator sees/edits the full record for their org; family/guardian see only their
person, only the shared slice.

---

## 7. Build notes
- Each new page gates on a **capability**, not a role — so the future 32-role model is a
  data change to `ROLE_CAPABILITIES` / `GRANT_ROLE_CAPABILITIES`, no route rewrites.
- Portal + console are new **surfaces**; per project convention, design them in
  `docs/design/` (`.dc.html`) first, then build to match. `Caira Tablet & Web.dc.html`
  already covers the console screens (dashboard, participant record, oversight).
- Sector terms via `sectorLabels()` everywhere (Rule 4) — no hardcoded "participant".
- Reuse `care-needs.ts` (care profile) for the participant record; reuse the audit log
  for the console audit viewer; reuse `WaitlistForm` on public pages.
