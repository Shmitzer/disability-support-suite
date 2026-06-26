// anonymise.ts — pure de-identification ("right to erasure") logic for a participant.
//
// NDIS service records must be retained for ~7 years, so honouring an erasure request
// can't mean a hard delete — it means DE-IDENTIFICATION: strip every direct identifier
// while keeping the de-identified service record for the legally-required retention
// window. This module is pure + unit-tested; the audited DB write lives in
// participant-erasure-actions.ts (Rule 9).
//
// What we clear: the participant's direct + indirect identifiers (name, NDIS number,
// DOB, contact details, named third parties). What we keep: non-identifying plan
// metadata (management type, plan dates) so retained records stay statistically useful.

export const ANONYMISED_NAME_PREFIX = "Former participant";

// A stable, non-identifying label derived from the record id (never the name), so two
// erased participants don't collide and the row stays referenceable in audit trails.
export function anonymisedLabel(participantId: string): string {
  const short = participantId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase();
  return short ? `${ANONYMISED_NAME_PREFIX} ${short}` : ANONYMISED_NAME_PREFIX;
}

// The identifier columns an erasure clears. Centralised so the schema, the SQL, and
// the action can't drift on which fields count as PII. `name` is replaced with the
// non-identifying label; the rest are nulled.
export const PARTICIPANT_IDENTIFIER_FIELDS = [
  "ndisNumber",
  "preferredName",
  "dateOfBirth",
  "pronouns",
  "primaryDisability",
  "communicationNeeds",
  "culturalNeeds",
  "address",
  "phone",
  "email",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "gpName",
  "gpPhone",
  "planManagerName",
  "planManagerContact",
  "supportCoordinator",
] as const;

export type AnonymisedParticipantFields = {
  name: string;
  anonymisedAt: Date;
} & Record<(typeof PARTICIPANT_IDENTIFIER_FIELDS)[number], null>;

// The Prisma `update.data` object that de-identifies a participant row: name → label,
// every identifier field → null, and a tombstone timestamp. Pure: no DB, no clock
// beyond the caller-supplied `now`.
export function anonymisedParticipantFields(
  participantId: string,
  now: Date = new Date(),
): AnonymisedParticipantFields {
  const cleared = Object.fromEntries(
    PARTICIPANT_IDENTIFIER_FIELDS.map((f) => [f, null]),
  ) as Record<(typeof PARTICIPANT_IDENTIFIER_FIELDS)[number], null>;
  return {
    name: anonymisedLabel(participantId),
    anonymisedAt: now,
    ...cleared,
  };
}

// Redact a participant's (and any named third parties') names out of free text — used
// to scrub retained ProgressNote bodies during erasure. Replaces the full name and
// each significant part (≥3 chars, to skip initials) with a fixed marker. Distinct
// from pii.ts's tokenise/restore round-trip: erasure is one-way, no restore.
export const REDACTION_MARKER = "[removed]";

export function redactNames(text: string, names: string[]): string {
  const variants = [
    ...new Set(
      names
        .flatMap((n) => [n, ...n.split(/\s+/)])
        .map((p) => p.trim())
        .filter((p) => p.length >= 3),
    ),
  ].sort((a, b) => b.length - a.length); // longest first: full name before its parts

  let out = text;
  for (const v of variants) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(v)}\\b`, "gi"), REDACTION_MARKER);
  }
  return out;
}

// True once a participant has been de-identified — callers should treat the record as
// retention-only (no further edits, hidden from active lists).
export function isAnonymised(p: { anonymisedAt?: Date | null }): boolean {
  return p.anonymisedAt != null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
