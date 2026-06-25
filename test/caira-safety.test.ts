// Unit tests for the participant safety layer (src/lib/caira/safetyDetect.ts):
// the keyword pre-check that raises a worker flag, and the reply sanitiser that
// strips the model's safetyFlag JSON so a participant never sees raw JSON.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { quickSafetyCheck, stripSafetyJson } from "../src/lib/caira/safetyDetect";

test("quickSafetyCheck: flags clear distress phrases", () => {
  for (const msg of [
    "I feel unsafe here",
    "someone is hurting me",
    "I want to die",
    "they won't let me leave",
    "please call 000",
  ]) {
    const r = quickSafetyCheck(msg);
    assert.equal(r.flagged, true, `expected flag for: ${msg}`);
    assert.match(r.reason ?? "", /keyword match:/);
  }
});

test("quickSafetyCheck: case-insensitive", () => {
  assert.equal(quickSafetyCheck("I AM SCARED").flagged, true);
});

test("quickSafetyCheck: benign messages are not flagged", () => {
  for (const msg of ["What's for lunch?", "When is my walk today?", "I had a good sleep"]) {
    assert.equal(quickSafetyCheck(msg).flagged, false, `unexpected flag for: ${msg}`);
  }
});

test("quickSafetyCheck: intentionally broad (false positives are acceptable)", () => {
  // "I hurt my knee" SHOULD flag — better to over-flag than miss a real concern.
  assert.equal(quickSafetyCheck("I hurt my knee at the park").flagged, true);
});

test("stripSafetyJson: removes a trailing safetyFlag object and reports the flag", () => {
  const raw = 'That sounds really hard. You are safe to talk to me.\n{"safetyFlag": true, "flagReason": "said scared"}';
  const { cleaned, flagged } = stripSafetyJson(raw);
  assert.equal(flagged, true);
  assert.equal(cleaned.includes("safetyFlag"), false);
  assert.match(cleaned, /You are safe to talk to me/);
});

test("stripSafetyJson: strips code fences around the JSON", () => {
  const raw = 'Okay!\n```json\n{"safetyFlag": false}\n```';
  const { cleaned, flagged } = stripSafetyJson(raw);
  assert.equal(flagged, false);
  assert.equal(cleaned.includes("```"), false);
  assert.equal(cleaned.includes("safetyFlag"), false);
  assert.equal(cleaned.trim(), "Okay!");
});

test("stripSafetyJson: leaves a plain reply untouched", () => {
  const raw = "Your next activity is at 2pm.";
  const { cleaned, flagged } = stripSafetyJson(raw);
  assert.equal(flagged, false);
  assert.equal(cleaned, raw);
});
