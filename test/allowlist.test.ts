// Tests for the soft-release email allowlist (src/lib/allowlist.ts).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isEmailAllowed, allowlistActive } from "../src/lib/allowlist";

afterEach(() => {
  delete process.env.AUTH_ALLOWLIST;
});

test("unset allowlist → not enforced, everyone allowed", () => {
  delete process.env.AUTH_ALLOWLIST;
  assert.equal(allowlistActive(), false);
  assert.equal(isEmailAllowed("anyone@example.com"), true);
  assert.equal(isEmailAllowed(null), true);
});

test("exact emails (case-insensitive), others denied", () => {
  process.env.AUTH_ALLOWLIST = "Edward.Neppl@gmail.com, sam@nls.org";
  assert.equal(allowlistActive(), true);
  assert.equal(isEmailAllowed("edward.neppl@gmail.com"), true);
  assert.equal(isEmailAllowed("SAM@NLS.ORG"), true);
  assert.equal(isEmailAllowed("stranger@gmail.com"), false);
  assert.equal(isEmailAllowed(""), false);
  assert.equal(isEmailAllowed(undefined), false);
});

test("@domain entry allows the whole domain", () => {
  process.env.AUTH_ALLOWLIST = "@caira.app";
  assert.equal(isEmailAllowed("anyone@caira.app"), true);
  assert.equal(isEmailAllowed("anyone@other.com"), false);
});

test("whitespace/newline separated entries parse", () => {
  process.env.AUTH_ALLOWLIST = "a@x.com\n b@y.com ";
  assert.equal(isEmailAllowed("a@x.com"), true);
  assert.equal(isEmailAllowed("b@y.com"), true);
});
