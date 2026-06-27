// Unit tests for the pure waitlist helpers (src/lib/waitlist.ts). No DB/IO. The
// server action (waitlist-actions.ts) is exercised live once Postgres is applied.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, normaliseEmail } from "../src/lib/waitlist";

test("isValidEmail: accepts normal addresses", () => {
  for (const ok of ["foo@bar.com", "a.b+tag@sub.example.co.uk"]) {
    assert.equal(isValidEmail(ok), true, ok);
  }
});

test("isValidEmail: rejects empties and typos", () => {
  for (const bad of ["", "   ", "foo", "foo@", "@bar.com", "foo @bar.com", "foo@bar"]) {
    assert.equal(isValidEmail(bad), false, JSON.stringify(bad));
  }
});

test("normaliseEmail: trims and lowercases", () => {
  assert.equal(normaliseEmail("  Foo@Bar.COM "), "foo@bar.com");
});
