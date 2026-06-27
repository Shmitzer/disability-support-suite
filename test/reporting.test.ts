// Tests for the pure reporting helpers (src/lib/reporting.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, rate, countBy } from "../src/lib/reporting";

test("toCsv: header + rows, escaping commas/quotes/newlines, null→empty", () => {
  const csv = toCsv(
    ["A", "B", "C"],
    [
      ["plain", 'has, comma', null],
      ["q\"uote", "line\nbreak", 3],
    ],
  );
  const lines = csv.split("\n");
  assert.equal(lines[0], "A,B,C");
  assert.ok(lines[1].includes('"has, comma"'));
  assert.ok(lines[1].endsWith(",")); // null → empty cell
  assert.ok(csv.includes('"q""uote"'));
  assert.ok(csv.includes('"line\nbreak"'));
});

test("rate: percentage, guards divide-by-zero", () => {
  assert.equal(rate(1, 4), 25);
  assert.equal(rate(0, 0), 0);
  assert.equal(rate(3, 0), 0);
  assert.equal(rate(2, 3), 67); // rounded
});

test("countBy: groups by key", () => {
  const out = countBy(
    [{ t: "a" }, { t: "b" }, { t: "a" }],
    (x) => x.t,
  );
  assert.deepEqual(out, { a: 2, b: 1 });
});
