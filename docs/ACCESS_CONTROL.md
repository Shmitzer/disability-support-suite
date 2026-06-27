# Participant Documentation Portal — Access Control Model

_Design document. NO code yet — this is the rule we will build against later (Phase 5)._
_Status: **Chunk 1 of 5 — the core access rule.** (Chunks 2–5: sensitivity levels, consent + uploads, access audit log, data contract.)_

---

## Why this document exists

The Participant Portal lets a participant log in and see the documentation about their own
care. The single most important question it must answer, every single time, is:

> **"Is *this person* allowed to see *this record* — and did we log that they saw it?"**

If we get that rule wrong on health data, that is a privacy breach, not a bug. So we write
the rule down in plain English first, agree on it, and only then build code that obeys it.

---

## Chunk 1 — The core access rule

### The actors (who is asking to see something)

| Actor | Who they are | Already in our data model? |
|-------|--------------|----------------------------|
| **Participant** | The person the records are *about*. The portal exists for them. | `Participant` |
| **Support worker (DSW)** | Frontline staff who deliver support and write notes. | `Worker` (role) |
| **Manager / admin** | Roster, run compliance, export to NDIS, oversee the org. | `Worker` (role = rostering) |
| **Provider** | The organisation itself / its uploaded content. In this app's scope, treated as **manager-level** for now. | _(future)_ |

> **Teaching note — we already own the key relationship.** A worker is linked to specific
> participants through the **`WorkerParticipant`** table you built in Phase 1. That link is what
> will grant a worker access — *not* "is a worker", but "is a worker **linked to this
> participant**". The data model you already have is doing the heavy lifting here.

### The foundation rule: **deny by default**

> **Nothing is visible to anyone unless a rule below explicitly allows it.**

This is the safest possible starting assumption (security people call it **"default deny"**).
If we ever forget to write a rule for some new record type, the system hides it rather than
leaking it. Silence = no.

### The grants (the *only* ways access is allowed)

| Actor | Can see… | The condition |
|-------|----------|---------------|
| **Participant** | Records **about themselves** | `record.participantId == me` — **and** the record isn't in a "needs a safeguard" category *(decided in Chunk 2)* |
| **Support worker** | Records about a participant **they are linked to** | a `WorkerParticipant` link exists between them — **and** scoped to what they need to deliver support *(refined in Chunk 2)* |
| **Manager / admin** | Records across **their organisation's** participants | they hold the manager role |
| **Anyone** | Their **own** uploads, always | they are the uploader *(detailed in Chunk 3)* |

### One thing we are deliberately NOT deciding yet

A participant seeing **everything** about themselves sounds simple, but two edge cases need a
real decision (and they belong in later chunks, not here):

1. **Third-party information** — a note that mentions another participant or a family member.
   The participant can see info about *themselves*, not *others*. → Chunk 2 (sensitivity).
2. **Clinically sensitive items** — rare cases where a clinician may stage *how* information is
   shared. NDIS leans hard toward transparency, so our default is **"participant can see it"**;
   any exception must be explicit and logged. → Chunk 2 / Chunk 3 (consent).

Flagging these now so we don't pretend the simple rule covers them. We'll close them deliberately.

---

## Validation check (does the rule give the right answer?)

Per our working contract, every output gets a test. For a *design* doc, the test is a set of
worked scenarios — we read each one and confirm the rule above produces the answer a privacy
auditor would want.

| # | Scenario | Rule applied | Expected result | ✅? |
|---|----------|--------------|-----------------|-----|
| 1 | Participant **Priya** opens her own shift report | `participantId == me` | **Allowed** — she sees it | ✅ |
| 2 | Priya tries to open **another participant's** report | `participantId != me`, no grant | **Denied** (default deny) | ✅ |
| 3 | Worker **linked to Priya** opens Priya's report | `WorkerParticipant` link exists | **Allowed** | ✅ |
| 4 | Worker **NOT linked to Priya** opens her report | no link, no grant | **Denied** (default deny) | ✅ |
| 5 | A **manager** opens Priya's report | holds manager role | **Allowed** | ✅ |
| 6 | A **brand-new record type** is added and we forget to write a rule | no explicit grant | **Denied** — safe failure | ✅ |
| 7 | Priya opens a note that **mentions another participant** | needs safeguard (Chunk 2) | **Deferred** — flagged, not yet decided | ⏸ |

Scenarios 1–6 pass cleanly. Scenario 7 is correctly *parked* for Chunk 2 — which proves we
found the gap rather than papering over it.

---

## Open questions carried into later chunks
- **Chunk 2:** sensitivity levels per record type; how third-party info inside a note is handled.
- **Chunk 3:** consent — especially for participant-uploaded and clinically sensitive content.
- **Chunk 4:** the access audit log (every view/download logged, reusing the `ShiftEvent` pattern).
- **Chunk 5:** the formal data contract (schemas, field types, validation rules, compatibility).
