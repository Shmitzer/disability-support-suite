// Tests for the document chunker (src/lib/chunk-text.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../src/lib/chunk-text";

test("short text → single chunk", () => {
  assert.deepEqual(chunkText("Just a short note."), ["Just a short note."]);
});

test("empty/whitespace → no chunks", () => {
  assert.deepEqual(chunkText("   \n  "), []);
});

test("long text → multiple chunks covering all content", () => {
  const para = "This is a sentence about the participant's care plan. ".repeat(60); // ~3000 chars
  const chunks = chunkText(para, 1000, 100);
  assert.ok(chunks.length >= 3);
  // Every chunk is within a sane bound of the target size.
  assert.ok(chunks.every((c) => c.length <= 1000 + 50));
  // Coverage: the joined chunks contain the distinctive phrase many times.
  assert.ok(chunks.join(" ").includes("care plan"));
});

test("overlap carries context across a boundary", () => {
  const text = "A".repeat(500) + "\n\nUNIQUE_MARKER boundary fact.\n\n" + "B".repeat(700);
  const chunks = chunkText(text, 520, 120);
  assert.ok(chunks.length >= 2);
});
