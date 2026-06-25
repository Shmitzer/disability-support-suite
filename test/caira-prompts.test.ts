// Unit tests for the Caira system-prompt builders (src/lib/caira/systemPrompts.ts).
// These pin the contract the API relies on: web guidance only appears when granted,
// the participant safety block is identical across both language levels, and the two
// levels differ only in their "how to talk" guidance.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  workerPrompt,
  supervisorPrompt,
  participantSimplePrompt,
  participantAdjustedPrompt,
} from "../src/lib/caira/systemPrompts";

const workerCtx = {
  workerName: "Sam",
  participantName: "Priya",
  shiftStartTime: "09:00",
  eventsLoggedToday: [] as string[],
  currentScreen: "shift log",
};

const supCtx = {
  supervisorName: "Lee",
  orgName: "Acme Care",
  activeShiftsToday: 3,
  openFlags: 1,
  currentScreen: "dashboard",
};

const pCtx = {
  participantName: "Priya",
  workerName: "Sam",
  todaySchedule: ["10:00 · Community centre"],
  currentScreen: "the app",
};

test("workerPrompt: no web block by default; no-internet line present", () => {
  const p = workerPrompt(workerCtx);
  assert.equal(p.includes("WEB SEARCH:"), false);
  assert.match(p, /no internet access/i);
  assert.match(p, /Nothing logged yet/); // empty events → fallback line
});

test("workerPrompt: web block appears only when webEnabled", () => {
  const p = workerPrompt({ ...workerCtx, webEnabled: true });
  assert.match(p, /WEB SEARCH:/);
  assert.match(p, /cite the source/i);
});

test("supervisorPrompt: web block gated on webEnabled; injects context", () => {
  const off = supervisorPrompt(supCtx);
  assert.equal(off.includes("WEB SEARCH:"), false);
  assert.match(off, /Acme Care/);
  assert.match(off, /Active shifts today: 3/);
  assert.match(off, /Unreviewed safety flags: 1/);

  const on = supervisorPrompt({ ...supCtx, webEnabled: true });
  assert.match(on, /WEB SEARCH:/);
});

test("participant prompts: safety block is byte-identical across both levels", () => {
  const marker = "SAFETY — THIS IS THE MOST IMPORTANT RULE:";
  const simple = participantSimplePrompt(pCtx);
  const adjusted = participantAdjustedPrompt(pCtx);
  const safetyOf = (s: string) => s.slice(s.indexOf(marker));
  assert.ok(simple.includes(marker) && adjusted.includes(marker));
  assert.equal(safetyOf(simple), safetyOf(adjusted));
});

test("participant levels differ in tone guidance", () => {
  const simple = participantSimplePrompt(pCtx);
  const adjusted = participantAdjustedPrompt(pCtx);
  assert.match(simple, /One idea at a time/i);
  assert.equal(adjusted.includes("One idea at a time"), false);
  assert.match(adjusted, /3–4 sentences/);
});

test("participant prompts never offer internet access", () => {
  for (const p of [participantSimplePrompt(pCtx), participantAdjustedPrompt(pCtx)]) {
    assert.match(p, /Never use the internet/i);
    assert.equal(p.includes("WEB SEARCH:"), false);
  }
});
