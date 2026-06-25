// Unit tests for the pure note→entries mapper (src/lib/note-extraction.ts). The
// LLM call lives in ai.ts (network, not tested here); this pins the deterministic
// half: the catalogue stays in sync with the chips, detail strings are built from
// valid options only, and relative-time HH:MM resolves onto the note's date.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractionCatalogue,
  parseTimeOnDate,
  buildDetailFromGroups,
  mapExtractedToEntries,
  EXTRACTION_TARGETS,
  type ExtractedItem,
} from "../src/lib/note-extraction";

const BASE = new Date("2026-06-24T06:00:00"); // the note's start (local)

test("extractionCatalogue: lists real chips and excludes the source Note", () => {
  const cat = extractionCatalogue();
  assert.ok(cat.includes("Toileting"));
  assert.ok(cat.includes("Fluids"));
  assert.ok(cat.includes("Water, Tea, Coffee, Juice")); // drink options surfaced
  assert.ok(!/^- Note /m.test(cat)); // Note is the source, not a target
  assert.ok(!EXTRACTION_TARGETS.some((c) => c.key === "Note"));
});

test("extractionCatalogue: scopes to allowedKeys when given", () => {
  const scoped = extractionCatalogue(["Fluids"]);
  assert.ok(scoped.includes("Fluids"));
  assert.ok(!scoped.includes("Toileting")); // excluded when not allowed
  // Unscoped still lists everything.
  assert.ok(extractionCatalogue().includes("Toileting"));
});

test("parseTimeOnDate: resolves HH:MM onto the base date; bad input falls back", () => {
  assert.equal(parseTimeOnDate("07:30", BASE).getHours(), 7);
  assert.equal(parseTimeOnDate("07:30", BASE).getMinutes(), 30);
  // same calendar day as base
  assert.equal(parseTimeOnDate("07:30", BASE).getDate(), BASE.getDate());
  // garbage / out-of-range → base unchanged
  assert.equal(parseTimeOnDate("99:99", BASE).getHours(), BASE.getHours());
  assert.equal(parseTimeOnDate(undefined, BASE).getHours(), BASE.getHours());
});

test("buildDetailFromGroups: keeps valid options, drops unknowns, adds amount", () => {
  // Fluids: known drink + amount → "Coffee · 250 mL"
  assert.equal(buildDetailFromGroups("Fluids", { drink: ["Coffee"] }, 250), "Coffee · 250 mL");
  // unknown option for a fixed group is dropped
  assert.equal(buildDetailFromGroups("Toileting", { type: ["Banana"] }, undefined), null);
  // valid Toileting type
  assert.equal(buildDetailFromGroups("Toileting", { type: ["Urine"] }, undefined), "Urine");
});

test("buildDetailFromGroups: honours showWhen (Bristol only for Bowel/Both)", () => {
  // Urine → Bristol scale must NOT appear even if the model supplied one
  const urine = buildDetailFromGroups("Toileting", {
    type: ["Urine"],
    bristol: ["Type 4 (smooth, ideal)"],
  });
  assert.equal(urine, "Urine");
  // Bowel → Bristol allowed
  const bowel = buildDetailFromGroups("Toileting", {
    type: ["Bowel"],
    bristol: ["Type 4 (smooth, ideal)"],
  });
  assert.ok(bowel?.includes("Bowel"));
  assert.ok(bowel?.includes("Type 4"));
});

test("buildDetailFromGroups: free-text allowed only where the group permits it", () => {
  // drink allows "other" → a learned value passes through
  assert.equal(buildDetailFromGroups("Fluids", { drink: ["Milo"] }, undefined), "Milo");
  // Toileting type has no free text → unknown dropped
  assert.equal(buildDetailFromGroups("Toileting", { type: ["Spaceship"] }, undefined), null);
});

test("mapExtractedToEntries: maps the narrative, sorts by time, skips junk", () => {
  const items: ExtractedItem[] = [
    { category: "Meal", time: "07:30", note: "cereal at the table", groups: { meal: ["Breakfast"] } },
    { category: "Toileting", time: "06:00", note: "did a wee", groups: { type: ["Urine"] } },
    { category: "Nonsense", time: "06:30", note: "ignored" }, // unknown category → dropped
    { category: "Note", time: "06:40", note: "also dropped (source, not target)" },
    { category: "Fluids", time: "06:10", note: "", groups: { drink: ["Coffee"] }, amountMl: 250 },
  ];
  const out = mapExtractedToEntries(items, BASE);

  assert.deepEqual(
    out.map((e) => e.category),
    ["Toileting", "Fluids", "Meal"], // chronological, junk removed
  );
  assert.equal(out[0].detail, "Urine");
  assert.equal(out[1].detail, "Coffee · 250 mL");
  assert.equal(out[2].detail, "Breakfast");
  assert.equal(out[0].timestamp.getHours(), 6);
  assert.equal(out[2].timestamp.getHours(), 7);
});

test("buildDetailFromGroups: Toilet keeps assist (single) + obs (multi) together", () => {
  const detail = buildDetailFromGroups("Toileting", {
    type: ["Both"],
    assist: ["Assisted"],
    obs: ["Accident / incontinence", "Continence aid changed"],
  });
  assert.equal(detail, "Both · Assisted · Accident / incontinence · Continence aid changed");
});

test("buildDetailFromGroups: Hygiene skin check is multi-select", () => {
  const detail = buildDetailFromGroups("Hygiene", {
    tasks: ["Shower"],
    assist: ["Prompted"],
    skin: ["Redness", "Skin tear"],
  });
  assert.equal(detail, "Shower · Prompted · Redness · Skin tear");
});

test("mapExtractedToEntries: timeEstimated defaults true unless explicitly false", () => {
  const out = mapExtractedToEntries(
    [
      { category: "Meal", time: "08:00", groups: { meal: ["Breakfast"] } }, // no flag → estimated
      { category: "Fluids", time: "09:00", timeEstimated: false, groups: { drink: ["Water"] } },
      { category: "Activity", time: "10:00", timeEstimated: true, groups: { activity: ["Outing"] } },
    ],
    BASE,
  );
  const byCat = Object.fromEntries(out.map((e) => [e.category, e.timeEstimated]));
  assert.equal(byCat.Meal, true);
  assert.equal(byCat.Fluids, false);
  assert.equal(byCat.Activity, true);
});

test("mapExtractedToEntries: tolerates non-array / empty input", () => {
  assert.deepEqual(mapExtractedToEntries([], BASE), []);
  // @ts-expect-error — exercising defensive runtime handling of bad input
  assert.deepEqual(mapExtractedToEntries(null, BASE), []);
});
