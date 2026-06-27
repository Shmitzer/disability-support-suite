// Unit tests for cleanTranscript (src/lib/ai.ts) — the pure post-processor that
// strips the boilerplate a model sometimes wraps a transcript in, so we store just
// the spoken words. The network transcription path can't be unit-tested here; this
// pins the deterministic cleanup.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTranscript } from "../src/lib/ai";

test("cleanTranscript: passes clean text through untouched", () => {
  assert.equal(cleanTranscript("John had lunch and a short walk."), "John had lunch and a short walk.");
});

test("cleanTranscript: strips a leading 'transcript:' style preamble", () => {
  assert.equal(cleanTranscript("Transcript: he ate well."), "he ate well.");
  assert.equal(cleanTranscript("Sure, here's the transcript: he ate well."), "he ate well.");
  assert.equal(cleanTranscript("Here is the verbatim transcript — he ate well."), "he ate well.");
});

test("cleanTranscript: strips surrounding quotes", () => {
  assert.equal(cleanTranscript('"he ate well."'), "he ate well.");
});

test("cleanTranscript: trims whitespace and tolerates empty (silence)", () => {
  assert.equal(cleanTranscript("   he ate well.  "), "he ate well.");
  assert.equal(cleanTranscript(""), "");
  assert.equal(cleanTranscript("   "), "");
});

test("cleanTranscript: does not eat the word 'transcript' mid-sentence", () => {
  const s = "We discussed the transcript of the meeting.";
  assert.equal(cleanTranscript(s), s);
});
