// Tests for the assistant context ranking (src/lib/assistant-retrieval.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreSnippet, topContext } from "../src/lib/assistant-retrieval";

test("scoreSnippet: overlap scores > 0, no overlap = 0", () => {
  assert.ok(scoreSnippet("seizure plan", "Seizure management plan: rescue midazolam") > 0);
  assert.equal(scoreSnippet("seizure plan", "favourite meals and drinks"), 0);
  assert.equal(scoreSnippet("", "anything"), 0);
});

test("scoreSnippet: ignores short/stop words", () => {
  // Only stopwords/short → no signal.
  assert.equal(scoreSnippet("what is the", "the is a to of"), 0);
});

test("topContext: returns most relevant first, drops zero-score, respects n", () => {
  const items = [
    { id: "a", content: "NDIS plan goals and funding categories" },
    { id: "b", content: "Sam likes swimming on Tuesdays" },
    { id: "c", content: "NDIS funding and plan review dates" },
  ];
  const top = topContext("ndis funding plan", items, 2);
  assert.equal(top.length, 2);
  assert.deepEqual(
    top.map((t) => t.id).sort(),
    ["a", "c"],
  );
  assert.ok(!top.find((t) => t.id === "b")); // unrelated dropped
});

test("topContext: empty when nothing matches", () => {
  assert.deepEqual(topContext("xyz", [{ id: "a", content: "hello world" }]), []);
});
