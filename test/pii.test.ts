// Unit tests for src/lib/pii.ts — the PII scrub applied before any text is sent to an
// external AI provider (Rule 2). Covers name tokenise/restore and the structured-
// identifier redaction (email / phone / NDIS number), including the spaced-number
// forms the original regexes missed.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { scrubPII } from "../src/lib/pii";

test("scrubPII: tokenises known names and restores the first name", () => {
  const { text, restore } = scrubPII("Priya Sharma had lunch; Priya was happy.", ["Priya Sharma"]);
  assert.equal(text.includes("Priya"), false, "real name must not leave the app");
  assert.match(text, /PERSON_1/);
  assert.equal(restore("PERSON_1 had a good day"), "Priya had a good day");
});

test("scrubPII: redacts email addresses", () => {
  const { text } = scrubPII("Contact me at jane.doe@example.com please.");
  assert.equal(text.includes("jane.doe@example.com"), false);
  assert.match(text, /\[redacted email\]/);
});

test("scrubPII: redacts an unseparated 9-digit NDIS number", () => {
  const { text } = scrubPII("NDIS number 430123456 on file.");
  assert.equal(text.includes("430123456"), false);
  assert.match(text, /\[redacted id\]/);
});

test("scrubPII: redacts a SPACED NDIS number (old regex missed this)", () => {
  const { text } = scrubPII("NDIS 430 123 456 on file.");
  assert.equal(text.includes("430 123 456"), false);
  assert.match(text, /\[redacted id\]/);
});

test("scrubPII: redacts common Australian phone formats", () => {
  for (const phone of ["0412 345 678", "+61 2 9876 5432", "(02) 9876 5432"]) {
    const { text } = scrubPII(`Call ${phone} today.`);
    assert.equal(text.includes(phone), false, `phone leaked: ${phone}`);
    assert.match(text, /\[redacted phone\]/);
  }
});

test("scrubPII: redacts structured identifiers even with no names supplied", () => {
  // Defence in depth: a missing names list must still strip emails/phones/ids.
  const { text } = scrubPII("Email a@b.co, phone 0412 345 678, id 430123456.");
  assert.equal(/a@b\.co/.test(text), false);
  assert.equal(/0412 345 678/.test(text), false);
  assert.equal(/430123456/.test(text), false);
});

test("scrubPII: leaves ordinary text untouched", () => {
  const input = "Went for a walk in the park and had a cup of tea.";
  assert.equal(scrubPII(input).text, input);
});
