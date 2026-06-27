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

test("both canonical domains allowed together (caira.app app + caira.net.au AU marketing)", () => {
  // Decision (2026-06-27): canonical login domains are BOTH — caira.app for the
  // app and caira.net.au for AU marketing/staff. Edward sets the live env value;
  // the parser is data-driven, so this guards the both-domains config.
  process.env.AUTH_ALLOWLIST = "@caira.app, @caira.net.au";
  assert.equal(isEmailAllowed("worker@caira.app"), true);
  assert.equal(isEmailAllowed("hello@caira.net.au"), true);
  assert.equal(isEmailAllowed("admin@caira.net.au"), true);
  assert.equal(isEmailAllowed("stranger@caira.com"), false);
});

test("whitespace/newline separated entries parse", () => {
  process.env.AUTH_ALLOWLIST = "a@x.com\n b@y.com ";
  assert.equal(isEmailAllowed("a@x.com"), true);
  assert.equal(isEmailAllowed("b@y.com"), true);
});
