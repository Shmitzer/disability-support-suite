// Tests for the shift-window time helpers (src/lib/shift-time.ts) — the logic behind
// the "check the time" warnings on back-logged / estimated entries.

import { test } from "node:test";
import assert from "node:assert/strict";
import { minutesOfDay, isWithinWindow, timeWindowWarning } from "../src/lib/shift-time";

test("minutesOfDay: parses HH:MM, rejects junk", () => {
  assert.equal(minutesOfDay("00:00"), 0);
  assert.equal(minutesOfDay("09:30"), 570);
  assert.equal(minutesOfDay("23:59"), 1439);
  assert.equal(minutesOfDay("24:00"), null);
  assert.equal(minutesOfDay("9:5"), null);
  assert.equal(minutesOfDay(""), null);
  assert.equal(minutesOfDay(undefined), null);
});

test("isWithinWindow: same-day window", () => {
  assert.equal(isWithinWindow(600, 540, 1020), true); // 10:00 in 09:00–17:00
  assert.equal(isWithinWindow(500, 540, 1020), false); // before start
  assert.equal(isWithinWindow(1100, 540, 1020), false); // after end
});

test("isWithinWindow: overnight window wraps midnight", () => {
  // 22:00 → 06:00
  assert.equal(isWithinWindow(1380, 1320, 360), true); // 23:00 inside
  assert.equal(isWithinWindow(120, 1320, 360), true); // 02:00 inside
  assert.equal(isWithinWindow(720, 1320, 360), false); // 12:00 outside
});

test("timeWindowWarning: classifies before/after, null when inside or unusable", () => {
  assert.equal(timeWindowWarning("10:00", "09:00", "17:00"), null);
  assert.equal(timeWindowWarning("08:00", "09:00", "17:00"), "before_start");
  assert.equal(timeWindowWarning("18:00", "09:00", "17:00"), "after_end");
  // Unusable inputs never produce a false warning.
  assert.equal(timeWindowWarning("10:00", null, "17:00"), null);
  assert.equal(timeWindowWarning("bad", "09:00", "17:00"), null);
  // Overnight: anything outside reads as "after".
  assert.equal(timeWindowWarning("12:00", "22:00", "06:00"), "after_end");
});
