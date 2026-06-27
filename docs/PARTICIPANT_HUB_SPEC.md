# Participant Hub + first-user onboarding (Zef / NLS)

**Written 2026-06-27 (Cowork).** Companion to `docs/NEXT_PHASE_G_PLAN.md`. Captures the shared
multi-worker logging surface ("the hub"), the identity model for a triple-capacity user, and the
go-to-market onboarding that uses both as a wedge into NLS + a second provider.

---

## The scenario

Zef is supported **3:1** by a rotating mix from up to three organisations: **NLS**, his **mother's
independent sole-trader** practice, and a **second company**. At any moment up to three of them are
physically with him. We want a **single tablet at Zef's place** where whoever is on shift can log
events to **one accurate, attributed record** — instead of three phones producing three fragmented
note sets.

## The first user is the wedge — Zef's mother

She is the beachhead account, and a rare **triple-capacity** user:

- an **independent DSW** (so she feels the logging pain and the product value directly),
- Zef's **formal nominee** (so she is the *consent authority* for his record), and
- the **bridge** to NLS and the second company (she already works alongside both).

Onboarding her first yields three wins at once: a design partner for the hardest part of the model,
a live reference account, and a warm introduction into both target orgs. Land-and-expand, founder-led,
matches the marketing playbook.

## Her identity model — ONE user, THREE capacities

The auth foundation already models authorization as a **union of scoped grants** (`resolvePrincipal()`
→ org memberships ∪ active participant grants ∪ platform override; `can(principal, capability,
resource)`). So she is **one auth identity** holding simultaneously:

| Capacity | How it's modelled | What it's for |
|---|---|---|
| **Independent DSW** | *Solo Worker* membership in her **own sole-trader org** | Paid/rostered shifts for Zef — billable, EVV-tracked, her org owns the note |
| **Nominee / decision-maker** | **`participant_guardian`** grant on Zef (carries `consent:manage`) | She IS the consent authority — grants/revokes the other orgs' access to Zef's record |
| **Family carer** | **`family_carer_clinical`** grant on Zef | Unpaid family input — view notes, submit medication/routine, receive handover, give feedback |

**Core principle: capacity is captured per entry/shift, not baked into a single role.** Every entry
stamps `(user, actingCapacity, org, shiftId, funding-basis)`. A paid-shift note (worker capacity,
billable, her org) and a family observation (family capacity, unpaid) and a consent action (guardian
capacity) are distinct in **audit, billing, and consent basis** — the exact "dual-role consent"
problem the lawyer brief flags. The question "which user is the mother?" dissolves: she's one
identity, and note accuracy comes from recording the capacity at log time.

**Because she's the nominee, the consent model routes through her.** She onboards NLS + the second
company onto Zef's shared record via `ParticipantAccessGrant` + `Consent` (`consent:manage`). She
sees the consolidated cross-org timeline as guardian; each org sees only its own entries + whatever
she has consented to share. **This makes her the literal mechanism of expansion.**

## The hub — participant + device anchored

Flips the anchor from *one-worker / one-phone / one-shift* to **participant (Zef) + a registered
device**, with **N concurrently checked-in workers**.

**Leans on what's already built:** cross-org participant access via consent · capability RBAC +
union principal · **device quick-unlock PIN** (tap-to-attribute without full re-login) · **EVV**
(each worker's presence = their own visit verification, so 3:1 bills correctly per org) ·
idempotency keys + per-entity serialisation (safe concurrent logging) · participant care-profile
(chips tailor to Zef regardless of who's logging).

**Genuinely new (the hub build):**

1. **Hub session** — participant+device-anchored, holding *N* concurrent worker check-ins (each =
   its own shift/visit), with check-in/out and auto-lock/timeout.
2. **Tap-to-identify entry** — an avatar row of who's on shift now; tap your face + PIN → entry
   stamped with worker + capacity + org + shift. Idempotency preserved.
3. **Unified multi-org timeline** — one chronological feed merging everyone's entries, each clearly
   attributed (name · org · capacity); each viewer sees per their grant scope.
4. **Shared-device safeguarding** — auto-lock between entries, session timeout, device
   registration/trust, no cross-org private data beyond consent, explicit check-in/out.
5. **3:1 funding correctness** — each worker's presence/time bills to their own org/funding line.

## Onboarding flow (her as wedge)

1. She signs up as an **independent Solo Worker** (own org) and logs Zef's shifts solo — immediate
   personal value, no dependency on anyone else, dummy data.
2. As **nominee**, she sets up Zef's shared record + consent (guardian capacity).
3. The **hub** is introduced once NLS / second-company workers are also with Zef: she grants them
   scoped access → they check in on the shared tablet.
4. The shared record becomes the **live demo** she shows NLS + the second company → they onboard.

## Decisions locked (2026-06-27)

- **Mother = one user**, three capacities: Solo Worker (own org) + `participant_guardian`
  (`consent:manage`) + `family_carer_clinical` on Zef.
- **Hub = built into Phase G** — trial-critical *and* the GTM wedge.
- **Attribution = quick-unlock PIN tap** (reuses the built PIN).
- **Multi-org consent routed through the nominee.**
- **Capacity captured per entry/shift** (new `actingCapacity` on the log entry).

## cc build slice

- **Hub session model** — participant+device-anchored; N concurrent worker check-ins (each a
  shift/visit); check-in/out; auto-lock + timeout.
- **Per-entry actor + capacity attribution** — add `actingCapacity` (worker | family | guardian) +
  `actorWorkerId` + org + shiftId to the log-entry write; PIN-gated identify; idempotency intact;
  every capacity-stamped action audited (Rule 9).
- **Cross-org timeline read model** — merges entries across consented orgs onto Zef's timeline,
  scoped per viewer's grant; RLS `tenant_isolation` still holds per owning org.
- **Device registration/trust** — registered hub devices; PIN unlock; session lifecycle.
- Tests · unapplied `prisma/sql/*.sql` · graceful degradation · 12 rules (new tables need
  `userId`+`organisationId?` + RLS).

## cd design brief

- **Hub home** (participant-anchored): "who's on shift now" avatar row, Zef's care context, large
  quick-log affordances sized for a shared tablet.
- **Tap-to-identify + PIN sheet**; a capacity pick (worker / family) where it's ambiguous.
- **Unified multi-org timeline** with unmistakable per-entry attribution (name · org · capacity).
- **Check-in/out + auto-lock** states; shared-device privacy treatment.
- Tablet layout (distinct from the phone worker app and from `/console`); Sage & Clay tokens.

## Lawyer-brief additions (data-controller + consent)

- **Data controller** for Zef's *consolidated, multi-org* record — is the participant/nominee the
  controller and each org a contributor/processor? (Drives the hub's data model + RLS ownership.)
- **Triple-capacity consent** — paid-worker vs family vs guardian: the consent basis per capacity,
  and whether one acceptance can cover all.
- **Nominee as consent authority** granting cross-org access — validate under the NDIS rules + the
  Privacy Act (APPs).
- **Shared-device exposure / safeguarding** — a tablet in a participant's home co-used by three
  orgs: auto-lock, trust, breach exposure.
