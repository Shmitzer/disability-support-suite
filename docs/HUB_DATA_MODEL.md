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
cross-org. **Data-controller note (lawyer):** each entry's owning org controls that row; the
nominee's consent authorises the shared view — captured in `PARTICIPANT_HUB_SPEC.md` §lawyer.

## Capacity → funding

- **WORKER** check-in → `billable=true`, `shiftId` set → `VisitVerification` (EVV) + SCHADS/billing
  key off the `Shift` exactly as today.
- **FAMILY / GUARDIAN** check-in → `billable=false`, `accessGrantId` set, no billing.
- `actingCapacity` copied onto each entry for the timeline badge + audit.

## Attribution (PIN — reuse the built logic)

- Persist the existing quick-unlock PIN: add `pinHash` + `pinSetAt` to `Worker` (the "device
  quick-unlock PIN — logic only" gets a hashed store).
- Flow: trusted `HubDevice` → tap avatar → PIN → open/use that worker's `HubCheckIn` → log → entry
  stamped `loggedByWorkerId` + `actingCapacity` + org. Auto-lock between entries; session timeout.

## Audit (Rule 9) + idempotency (Rule 12)

- `recordAudit()` (hash-chain) for: check-in, check-out, each capacity-stamped entry, nominee
  consent grant/revoke, device pair/revoke.
- `LogEntry.idempotencyKey` kept; per-entity serialisation as in the offline-sync core, so
  near-simultaneous logging from one shared device can't collide or double-write.

## What cc builds

1. Schema + `prisma/sql/hub.sql` (additive, RLS on new tables, backfill). Unapplied.
2. Hub session lifecycle (open/close), check-in/out, capacity + billable + shift/grant linkage.
3. PIN persistence + verify; device-trust (pair/revoke).
4. `logHubEntry()` server action — PIN-gated; stamps `loggedByWorkerId`/`actingCapacity`/
   `participantId`/org; idempotent; audited; WORKER capacity also drives the `Shift` LogEntry +
   EVV path.
5. `participantHubTimeline()` read — `authorizeParticipantAccess`-gated, cross-org via Prisma,
   `// tenant-ok:` annotated, paginated.
6. Tests: capacity routing; cross-org read **denied without a grant**; idempotent concurrent
   logging; RLS enabled on the three new tables; the Zef-3:1 acceptance scenario.

## Open questions (Edward / lawyer)

- **Data controller** for the consolidated record — participant/nominee, or each contributing org?
- Can the **nominee's single consent** cover all three orgs' access, or is per-org consent required?
- Confirm the visibility split: each org sees only its own entries on its dashboards (yes), while
  the **hub timeline** shows all attendees' entries (yes — consent-gated). Lock this before build.
