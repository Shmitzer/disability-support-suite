// Tests for the SCHADS award pay-interpretation core (src/lib/schads.ts).
// Uses an explicit round-number config so assertions test the ENGINE structure,
// not the (verify-before-use) default multipliers.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ordinaryMultiplier,
  splitOvertime,
  payForShift,
  classifyDay,
  type SchadsConfig,
} from "../src/lib/schads";

const CFG: SchadsConfig = {
  version: "test",
  casualLoading: 0.25,
  casualMode: "added",
  day: { weekday: 1.0, saturday: 1.5, sunday: 1.75, public_holiday: 2.5 },
  eveningShift: 1.125,
  nightShift: 1.15,
  overtimeFirst: 1.5,
  overtimeAfter: 2.0,
  overtimeFirstHours: 2,
  ordinaryHoursPerDay: 8,
  sleepoverCents: 5000,
  brokenShiftCents: 2000,
};

test("ordinaryMultiplier: permanent vs casual (added loading)", () => {
  assert.equal(ordinaryMultiplier("weekday", "full_time", CFG), 1.0);
  assert.equal(ordinaryMultiplier("saturday", "part_time", CFG), 1.5);
  assert.equal(ordinaryMultiplier("weekday", "casual", CFG), 1.25); // 1.0 + 0.25
  assert.equal(ordinaryMultiplier("sunday", "casual", CFG), 2.0); // 1.75 + 0.25
});

test("ordinaryMultiplier: compounded casual mode", () => {
  const compounded = { ...CFG, casualMode: "compounded" as const };
  assert.equal(ordinaryMultiplier("saturday", "casual", compounded), 1.875); // 1.5 × 1.25
});

test("splitOvertime: ordinary fills first, then 2h @ first, rest @ after", () => {
  assert.deepEqual(splitOvertime(10, 0, CFG), { ordinary: 8, overtimeFirst: 2, overtimeAfter: 0 });
  assert.deepEqual(splitOvertime(11, 0, CFG), { ordinary: 8, overtimeFirst: 2, overtimeAfter: 1 });
  // already worked all ordinary today → whole shift is overtime
  assert.deepEqual(splitOvertime(5, 8, CFG), { ordinary: 0, overtimeFirst: 2, overtimeAfter: 3 });
});

test("payForShift: plain weekday ordinary", () => {
  const r = payForShift({ baseRateCents: 3000, hours: 8, dayType: "weekday", employment: "full_time" }, CFG);
  assert.equal(r.ordinaryCents, 8 * 3000); // 24000
  assert.equal(r.overtimeCents, 0);
  assert.equal(r.totalCents, 24000);
});

test("payForShift: Sunday permanent at 1.75x", () => {
  const r = payForShift({ baseRateCents: 3000, hours: 8, dayType: "sunday", employment: "full_time" }, CFG);
  assert.equal(r.ordinaryCents, Math.round(8 * 3000 * 1.75)); // 42000
});

test("payForShift: weekday with overtime (8 ord + 2@1.5 + 1@2.0)", () => {
  const r = payForShift({ baseRateCents: 3000, hours: 11, dayType: "weekday", employment: "full_time" }, CFG);
  assert.equal(r.ordinaryCents, 8 * 3000);
  assert.equal(r.overtimeCents, Math.round(2 * 3000 * 1.5 + 1 * 3000 * 2.0)); // 9000 + 6000 = 15000
});

test("payForShift: evening shift loading bites on weekday, NOT on Sunday (higher-of)", () => {
  const wk = payForShift(
    { baseRateCents: 3000, hours: 8, dayType: "weekday", employment: "full_time", shiftLoading: "evening" },
    CFG,
  );
  assert.equal(wk.ordinaryCents, Math.round(8 * 3000 * 1.125)); // 27000
  const sun = payForShift(
    { baseRateCents: 3000, hours: 8, dayType: "sunday", employment: "full_time", shiftLoading: "evening" },
    CFG,
  );
  assert.equal(sun.ordinaryCents, Math.round(8 * 3000 * 1.75)); // Sunday wins, evening ignored
  assert.equal(sun.breakdown.appliedShiftLoading, 1.0);
});

test("payForShift: casual overtime adds the loading", () => {
  const r = payForShift({ baseRateCents: 3000, hours: 10, dayType: "weekday", employment: "casual" }, CFG);
  // ordinary 8h @ (1.0+0.25), OT 2h @ (1.5+0.25)
  assert.equal(r.ordinaryCents, Math.round(8 * 3000 * 1.25)); // 30000
  assert.equal(r.overtimeCents, Math.round(2 * 3000 * 1.75)); // 10500
});

test("payForShift: sleepover + broken-shift allowances are flat adds", () => {
  const r = payForShift(
    { baseRateCents: 3000, hours: 8, dayType: "weekday", employment: "full_time", sleepovers: 1, brokenShift: true },
    CFG,
  );
  assert.equal(r.allowancesCents, 5000 + 2000);
  assert.equal(r.totalCents, 24000 + 7000);
});

test("classifyDay: PH > Sunday > Saturday > weekday", () => {
  assert.equal(classifyDay(0, false), "sunday");
  assert.equal(classifyDay(6, false), "saturday");
  assert.equal(classifyDay(3, false), "weekday");
  assert.equal(classifyDay(3, true), "public_holiday"); // PH overrides a weekday
  assert.equal(classifyDay(0, true), "public_holiday"); // PH overrides Sunday
});
