// Tests for the pure de-identification helpers (src/lib/anonymise.ts) that back the
// participant right-to-erasure workflow.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anonymisedLabel,
  anonymisedParticipantFields,
  redactNames,
  isAnonymised,
  PARTICIPANT_IDENTIFIER_FIELDS,
  REDACTION_MARKER,
} from "../src/lib/anonymise";

test("anonymisedLabel: stable, non-identifying, derived from id not name", () => {
  // Last 8 alphanumerics of the id, lowercased: "clp7f3a9c2bXY" → "3a9c2bxy".
  assert.equal(anonymisedLabel("clp_7f3a9c2bXY"), "Former participant 3a9c2bxy");
  // Two different ids don't collide.
  assert.notEqual(anonymisedLabel("aaaaaaaa"), anonymisedLabel("bbbbbbbb"));
  // Same id is deterministic.
  assert.equal(anonymisedLabel("abc12345"), anonymisedLabel("abc12345"));
  // Degenerate id still yields a safe label.
  assert.equal(anonymisedLabel("___"), "Former participant");
});

test("anonymisedParticipantFields: clears every identifier, sets name + tombstone", () => {
  const now = new Date("2026-06-26T10:00:00Z");
  const fields = anonymisedParticipantFields("participant_abc12345", now);

  assert.equal(fields.name, "Former participant abc12345");
  assert.equal(fields.anonymisedAt, now);
  // Every declared identifier field is nulled — guards against schema drift.
  for (const f of PARTICIPANT_IDENTIFIER_FIELDS) {
    assert.equal(fields[f], null, `${f} should be cleared`);
  }
});

test("redactNames: removes full name and significant parts, case-insensitive", () => {
  const text = "Priya Sharma went out. Later, priya had lunch with her brother Sam.";
  const out = redactNames(text, ["Priya Sharma"]);
  assert.ok(!/priya/i.test(out), "first name gone");
  assert.ok(!/sharma/i.test(out), "surname gone");
  assert.ok(out.includes(REDACTION_MARKER));
  // A third party we weren't told about still leaks (documented limitation).
  assert.ok(out.includes("Sam"));
});

test("redactNames: skips short tokens (initials) and is whole-word", () => {
  // "Jo" (<3 chars) must not nuke substrings like "Joanne" or "join".
  const out = redactNames("Jo will join Joanne", ["Jo"]);
  assert.equal(out, "Jo will join Joanne");
});

test("redactNames: redacts multiple names, longest-first (no partial clobber)", () => {
  const out = redactNames("Ann and Annabelle arrived", ["Ann", "Annabelle"]);
  assert.equal(out, `${REDACTION_MARKER} and ${REDACTION_MARKER} arrived`);
});

test("isAnonymised: true only once tombstoned", () => {
  assert.equal(isAnonymised({ anonymisedAt: null }), false);
  assert.equal(isAnonymised({}), false);
  assert.equal(isAnonymised({ anonymisedAt: new Date() }), true);
});
