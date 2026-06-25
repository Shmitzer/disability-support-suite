// Tests for the pure roster classifier (src/lib/support-roster.ts). The DB-bound
// access + query paths are integration-tested elsewhere; this covers the time logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyWhen } from "../src/lib/support-roster";

const now = new Date("2026-06-25T12:00:00Z");
const at = (h: number) => new Date(`2026-06-25T${String(h).padStart(2, "0")}:00:00Z`);

test("in-progress shift is always current", () => {
  assert.equal(classifyWhen(now, at(9), at(17), "IN_PROGRESS"), "current");
});

test("completed/cancelled are past regardless of time", () => {
  assert.equal(classifyWhen(now, at(13), at(17), "COMPLETED"), "past");
  assert.equal(classifyWhen(now, at(13), at(17), "CANCELLED"), "past");
});

test("scheduled window around now is current", () => {
  assert.equal(classifyWhen(now, at(9), at(17), "ALLOCATED"), "current");
});

test("future shift is upcoming, finished shift is past", () => {
  assert.equal(classifyWhen(now, at(14), at(18), "ALLOCATED"), "upcoming");
  assert.equal(classifyWhen(now, at(6), at(10), "ALLOCATED"), "past");
});
