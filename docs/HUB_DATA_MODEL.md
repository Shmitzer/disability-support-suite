# Hub data model — cc slice spec

**Written 2026-06-27 (Cowork).** The data layer for the Participant Hub (see
`PARTICIPANT_HUB_SPEC.md`): N concurrent workers logging to one attributed, cross-org, **consent-gated**
participant timeline. Grounded in the consolidated schema on `main` (`prisma/schema.prisma`).
Everything here is **additive** — it does not change the per-worker `Shift` model (billing / EVV /
SCHADS all key off `Shift`).

## Principle

A `Shift` stays *"one paid worker's rostered visit."* The hub adds an **attendance layer above
shifts** so that (a) non-paid family/guardian presence is first-class, (b) one shared screen can
route each entry to the right attendee **and capacity**, and (c) everyone's entries render as one
timeline. A worker-capacity attendance still *is* a `Shift` underneath (so EVV/billing/SCHADS are
unchanged); family/guardian attendance is authorised by a `ParticipantAccessGrant` instead.

## New models (additive)

```prisma
// A registered/trusted shared tablet (the "care station").
model HubDevice {
  id               String    @id @default(cuid())
  label            String
  participantId    String?   // anchored to a participant's home tablet, or null = roaming
  status           String    @default("ACTIVE") // ACTIVE | REVOKED
  pairedSecretHash String?   // device-trust secret (hashed)
  lastSeenAt       DateTime?
  userId           String
  organisationId   String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @default(now()) @updatedAt
}

// One shared session on a device for one participant (open while support is happening).
model HubSession {
  id             String    @id @default(cuid())
  participantId  String
  deviceId       String?
  status         String    @default("OPEN") // OPEN | CLOSED
  openedAt       DateTime  @default(now())
  closedAt       DateTime?
  userId         String
  organisationId String?   // host/coordinating-org context (e.g. NLS) for tenant scoping
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @default(now()) @updatedAt
  @@index([participantId, status])
}

// One attending worker within a session — this is the "N concurrent" part of 3:1.
model HubCheckIn {
  id             String    @id @default(cuid())
  hubSessionId   String
  workerId       String    // the attendee (Worker.id / principal)
  capacity       String    // WORKER | FAMILY | GUARDIAN
  billable       Boolean   @default(true)
  shiftId        String?   // set when capacity=WORKER (paid) → links EVV/billing/SCHADS
  accessGrantId  String?   // set when FAMILY/GUARDIAN → the ParticipantAccessGrant authorising presence
  checkedInAt    DateTime  @default(now())
  checkedOutAt   DateTime?
  userId         String
  organisationId String?   // the ATTENDEE's org (cross-org attribution + billing line); null = solo
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @default(now()) @updatedAt
  @@index([hubSessionId])
  @@index([workerId])
}
```

## `LogEntry` changes (additive, nullable, back-compatible)

```prisma
  shiftId          String?  // WAS NOT NULL → make nullable (an entry can hang off a hub check-in instead)
  hubCheckInId     String?  // set for hub-logged entries
  loggedByWorkerId String?  // explicit actor (the attendee); for mobile = the shift's allocatedToId
  actingCapacity   String?  // WORKER | FAMILY | GUARDIAN (denormalised for fast timeline + audit)
  participantId    String?  // denormalised so the cross-org timeline is one indexed read
  sourceDevice     String?  // TABLET | PHONE — which device captured it (audit only; optional)
```

Keep `idempotencyKey` (Rule 12). Stamp `userId`/`organisationId` from the **logging worker** (RLS
ownership). An entry references **either** a `shiftId` (mobile/paid path, unchanged) **or** a
`hubCheckInId` (hub path).

## Migration

Additive `prisma/sql/hub.sql` — `CREATE TABLE IF NOT EXISTS` for the three new models, `ALTER TABLE
"LogEntry" ADD COLUMN IF NOT EXISTS …` for the five columns, new tables get an RLS `tenant_isolation`
policy (Rule 10), `@@index` as above. **NEVER `db push`** — apply by hand via the editor-safe path.
Backfill existing rows: `actingCapacity='WORKER'`, `participantId` from the entry's shift,
`loggedByWorkerId` from `Shift.allocatedToId`. Making `shiftId` nullable is safe for existing rows.

## RLS + the cross-org timeline — the crux

Each `LogEntry` is owned by the **logging worker's org** (`organisationId`), so the existing
`tenant_isolation` policy keeps each org's own dashboards isolated, unchanged. But the unified hub
timeline spans three orgs, which org-matching RLS would (correctly) hide. So the consolidated read is
authorised by **consent, not org-match**, using the access layer that already exists:

1. `participantHubTimeline(viewer, participantId)` calls `resolvePrincipal()` +
   `authorizeParticipantAccess(viewer, participantId)` to confirm the viewer holds an **active
   `ParticipantAccessGrant`** on the participant (the nominee granted cross-org access).
2. Then it reads **all** `LogEntry WHERE participantId = … ` across orgs via **Prisma** (which
   bypasses RLS — the existing Option-A pattern), ordered by `timestamp`.
3. Because this is a deliberate cross-tenant read, annotate it `// tenant-ok: participant-grant-
   authorised hub timeline` so the `npm run check:tenant-scope` CI guard passes (same convention as
   the 5 existing annotated reads).

New hub tables get standard org `tenant_isolation`; only the *timeline read* is grant-authorised
cross-org. **Data-controller model (DECISION 2026-06-27): each org controls its own entries** — there
is no single controller of the consolidated record. Every row is owned + controlled by the logging
worker's org (its own audit trail, its own retention); the hub timeline is purely a **consent-gated
read-across** of those independently-owned rows, not a jointly-owned record. This is the simpler,
cleaner legal posture and it matches the per-row `organisationId` ownership already in the schema —
the cross-org read stays `authorizeParticipantAccess`-gated, nothing else changes.

## Capacity → funding

- **WORKER** check-in → `billable=true`, `shiftId` set → `VisitVerification` (EVV) + SCHADS/billing
  key off the `Shift` exactly as today.
- **FAMILY / GUARDIAN** check-in → `billable=false`, `accessGrantId` set, no billing.
- `actingCapacity` copied onto each entry for the timeline badge + audit.

## Attribution — PIN anchor + AI assist (DECISION 2026-06-27)

**Auth model:** each worker does a **full login once** on the shared device (registers their identity
+ sets a quick-unlock PIN), then attributes subsequent entries by **PIN tap**. Persist the existing
quick-unlock PIN: add `pinHash` + `pinSetAt` to `Worker` (the "device quick-unlock PIN — logic only"
gets a hashed store).

- Flow: trusted `HubDevice` → tap avatar → PIN → open/use that worker's `HubCheckIn` → log → entry
  stamped `loggedByWorkerId` + `actingCapacity` + org. Auto-lock between entries; session timeout.

**AI-assisted identification (Edward's ask) — assist, never auto-commit.** The hub can *suggest* who's
logging to cut taps, but the actor is always **confirmed**, because on a restraint/incident record the
attribution must be defensible in audit — an AI guess can't be the system of record.
- **Context signal (low-risk, build now):** infer the likely actor from state — who's checked in
  right now, who's rostered, recent activity. If exactly one worker is checked in, pre-select them
  (still one confirm). On a 3:1 screen, surface the on-shift workers ranked by likelihood.
- **Voice signal (assist only):** during dictation, the AI may *hint* the speaker from on-shift
  workers (e.g. first-person phrasing, prior pattern) and pre-highlight that avatar — the worker still
  taps to confirm.
- **Voiceprint biometrics — DEFERRED.** True speaker-ID by voiceprint is sensitive biometric data
  (heightened Privacy Act / consent obligations) and accuracy-risky; out of scope until the lawyer
  signs off. PIN stays the auth anchor; AI only ranks/pre-selects.

## Audit (Rule 9) + idempotency (Rule 12)

- `recordAudit()` (hash-chain) for: check-in, check-out, each capacity-stamped entry, nominee
  consent grant/revoke, device pair/revoke.
- `LogEntry.idempotencyKey` kept; per-entity serialisation as in the offline-sync core, so
  near-simultaneous logging from one shared device can't collide or double-write.

## Real-time multi-device sync (personal phone ↔ shared iPad)

A worker can log from **their own phone** *or* the **shared iPad**, and it stays one consistent
record with no double-ups. This is the key: **the session is participant-anchored, not device-bound.**

- **Same session, many clients.** A `HubSession` (participant + time window) has N `HubCheckIn`s
  (one per on-shift worker). The shared iPad and each worker's personal phone are just **concurrent
  clients of the same session** — a worker's entries attach to *their* check-in no matter which
  device typed them. (The iPad is a `HubDevice` with PIN-switching among workers; a personal phone
  is the worker's own logged-in app — no PIN-switch needed, it's already theirs.)
- **Live propagation via Supabase Realtime.** All clients in a session subscribe to a
  **participant/session broadcast channel**; every write publishes a lightweight "entry added/
  updated" ping so the iPad and all phones refresh within ~a second. Use a **broadcast channel keyed
  by participant** (not raw table-change subscriptions) — that sidesteps the RLS-on-Realtime
  cross-org limitation: the ping just says "something changed", then each client re-pulls via the
  existing `authorizeParticipantAccess`-gated timeline read, which already enforces who sees what.
- **No double-up — two layers, both already built:**
  1. *Technical (retries / the same entry arriving from two places):* every entry carries an
     **`idempotencyKey`** (Rule 12) so a replay is a no-op, and the **offline-sync core**
     (`src/lib/offline-sync.ts`) drains a per-entity-serialised outbox treating a server duplicate
     as success. A flaky phone re-sending can't double-write.
  2. *Human (two people logging the same real event):* the **live shared timeline** means everyone
     sees what's already logged, and a lightweight **presence** indicator ("Aria is adding a Meds
     entry…", via Realtime presence) warns before two workers record the same thing. Consistency by
     visibility, not just by merge.
- **Offline-tolerant.** A phone that loses signal keeps logging to its local outbox and drains on
  reconnect (per-entity serialised, so a clock-off can't replay before its clock-on); idempotency
  keeps the reconciled result clean.
- **Single source of truth = the DB.** Devices render optimistically but reconcile to server state on
  each Realtime ping, so the iPad and every phone converge on the same timeline.

## What cc builds

1. Schema + `prisma/sql/hub.sql` (additive, RLS on new tables, backfill). Unapplied.
2. Hub session lifecycle (open/close), check-in/out, capacity + billable + shift/grant linkage.
3. PIN persistence + verify; device-trust (pair/revoke).
4. `logHubEntry()` server action — PIN-gated; stamps `loggedByWorkerId`/`actingCapacity`/
   `participantId`/org; idempotent; audited; WORKER capacity also drives the `Shift` LogEntry +
   EVV path.
5. `participantHubTimeline()` read — `authorizeParticipantAccess`-gated, cross-org via Prisma,
   `// tenant-ok:` annotated, paginated.
6. **Real-time sync** — Supabase Realtime: publish a participant/session broadcast ping on each hub
   write; subscribe on every client (iPad + phones) to refresh the timeline; Realtime **presence**
   for the "X is logging…" indicator. Route every hub write through the `offline-sync` outbox with an
   `idempotencyKey` so retries/multi-device can't double-write.
7. Tests: capacity routing; cross-org read **denied without a grant**; idempotent concurrent logging
   (same entry from two devices = one row); RLS on the three new tables; the Zef-3:1 acceptance
   scenario.

## Restrictive-practice incidents (Zeph — the high-compliance path)

Zeph's case makes **restrictive practices (RP)** central: a severe TBI with impaired impulse
control, physical aggression, and **authorised physical + chemical restraint** under a behaviour
support plan (BSP), at a 3:1 ratio. RP use is among the most regulated NDIS areas — every use must be
recorded, and **unauthorised/emergency** use is a reportable incident to the NDIS Commission. The
existing `restrictive` chip group + the "may require reporting" notice are the quick-capture seed;
this promotes RP to a first-class, compliant `Incident`.

**`Incident` extension** — additive `prisma/sql/restrictive_practice.sql` (NOT `db push`):

```sql
ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "restrictivePractice"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rpType"               TEXT,    -- PHYSICAL | CHEMICAL | MECHANICAL | ENVIRONMENTAL | SECLUSION
  ADD COLUMN IF NOT EXISTS "rpAuthorised"         BOOLEAN, -- true = under current BSP; false = unauthorised/emergency → reportable
  ADD COLUMN IF NOT EXISTS "rpRoutineOrPrn"       TEXT,    -- ROUTINE | PRN
  ADD COLUMN IF NOT EXISTS "rpMedication"         TEXT,    -- chemical restraint: drug
  ADD COLUMN IF NOT EXISTS "rpDose"               TEXT,    -- chemical restraint: dose
  ADD COLUMN IF NOT EXISTS "rpDurationMinutes"    INTEGER, -- physical restraint / seclusion duration
  ADD COLUMN IF NOT EXISTS "lessRestrictiveTried" TEXT,    -- what was tried first (least-restrictive evidence)
  ADD COLUMN IF NOT EXISTS "bspReference"         TEXT,    -- the BSP authorising it
  ADD COLUMN IF NOT EXISTS "medicationAdminId"    TEXT;    -- links chemical restraint to MedicationAdministration (eMAR)
```

**Speed is the design constraint.** RP logging must be a few taps under duress, so the hub
pre-populates everything it already knows and only asks for what it can't infer:
- **Pre-filled from the hub check-in:** participant (Zeph), time (now), logging worker + capacity +
  org. Zero taps.
- **RP quick-buttons** come from the participant's **BSP-authorised RP list** on the care-profile —
  so an *authorised* use is one tap + confirm (fast path). An *unauthorised/emergency* use sets
  `rpAuthorised=false` → auto-flags `reportable=true` + the 24h Commission banner (the slow,
  serious path).
- **Chemical restraint cross-references the eMAR:** an `rpType=CHEMICAL` incident links the
  `MedicationAdministration` row (`medicationAdminId`) so the same dose isn't double-recorded and the
  drug/dose carry through — chemical restraint must be captured as RP *even when it's a routine PRN med*.
- **AI dictation pathway:** the narrative (`description`, `immediateAction`, `lessRestrictiveTried`)
  can be dictated via the existing voice → transcription → **editable review before save** flow
  (Rule 11) — fast under duress, but nothing saves unreviewed.

**Per-org audit for the same participant:** each RP incident is owned by the logging worker's org
(`organisationId`) and hash-chain audited (Rule 9), so all three orgs have an independent,
tamper-evident trail for Zeph while the hub timeline shows the consolidated, consent-gated view.

## Decisions (2026-06-27) + remaining lawyer items

**Locked:**
- **Build scope:** cc + cd build *everything* in parallel — the hub, the RP flow, and the simpler
  G2 screens (no staging).
- **RP flow:** full build now (on dummy data — the global "no real data until legal clears" gate
  already covers real RP events, so no separate hold is needed).
- **Device auth:** full login once per worker, then PIN tap; AI *assists* identification (context +
  voice hints) but the actor is always confirmed; voiceprint biometrics deferred.
- **Data controller:** each org controls its own entries; the hub timeline is a consent-gated
  read-across, no single controller.

**Still lawyer/clinical (don't block the dummy-data build, but gate real data):**
- Exact NDIS Commission **RP reporting obligations** (authorised cadence; unauthorised/emergency
  reportable timeframe) — confirm with lawyer + behaviour support practitioner.
- Whether **per-org consent** is needed for each org's cross-org timeline read, or one suffices.
- Sign-off on any **voiceprint** identification before it's built (currently deferred).
