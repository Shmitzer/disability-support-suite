// Tests for the in-page notice resolver (src/lib/notices.ts) — logic/flags only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeNotices, shouldShow, Notice } from "../src/lib/notices";

test("capture surface always shows the privacy reminder", () => {
  assert.deepEqual(activeNotices({ surface: "capture", category: "Meal" }), [Notice.CapturePrivacy]);
});

test("Incident capture adds the mandatory-fields notice", () => {
  const n = activeNotices({ surface: "capture", category: "Incident" });
  assert.ok(n.includes(Notice.CapturePrivacy));
  assert.ok(n.includes(Notice.IncidentMandatory));
});

test("Behaviour with a restrictive practice selected adds the reporting notice", () => {
  const withRp = activeNotices({
    surface: "capture",
    category: "Behaviour",
    groups: { restrictive: ["Physical restraint"] },
  });
  assert.ok(withRp.includes(Notice.RestrictivePracticeReporting));
  // ...but not when no restrictive practice is selected.
  const without = activeNotices({ surface: "capture", category: "Behaviour", groups: { behaviour: ["Verbal"] } });
  assert.ok(!without.includes(Notice.RestrictivePracticeReporting));
});

test("AI surfaces show the review notice", () => {
  assert.deepEqual(activeNotices({ surface: "aiGenerate" }), [Notice.AiReview]);
  assert.deepEqual(activeNotices({ surface: "noteReview" }), [Notice.AiReview]);
});

test("approval / family submit / export / login each map to their notice", () => {
  assert.deepEqual(activeNotices({ surface: "noteApproval" }), [Notice.NoteApprovalAttestation]);
  assert.deepEqual(activeNotices({ surface: "familySubmit" }), [Notice.FamilySubmitCaveat]);
  assert.deepEqual(activeNotices({ surface: "export" }), [Notice.ExportDeidentify]);
  assert.deepEqual(activeNotices({ surface: "login" }), [Notice.LoginPrivacy]);
});

test("shouldShow mirrors activeNotices", () => {
  assert.equal(shouldShow(Notice.IncidentMandatory, { surface: "capture", category: "Incident" }), true);
  assert.equal(shouldShow(Notice.IncidentMandatory, { surface: "capture", category: "Meal" }), false);
});
