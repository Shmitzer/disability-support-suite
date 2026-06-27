// Unit tests for the shift-photo round-trip logic (src/lib/photos.ts). Pure — no
// database, Storage bucket, or network — so they run anywhere:  npm test
//
// These cover the subtle/risky parts of the Storage cutover: mapping a signed
// display URL back to its stored path, and the keep-vs-upload decision (including
// the security rule that only paths already on the entry may be kept).

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractStoragePath, planPhotoUpdate, MAX_PHOTOS } from "../src/lib/photos";

const SIGNED =
  "https://ref.supabase.co/storage/v1/object/sign/shift-photos/shift123/abc-def.jpg?token=eyJ.sig";
const DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRoabc";

test("extractStoragePath: recovers the path from a signed URL", () => {
  assert.equal(extractStoragePath(SIGNED), "shift123/abc-def.jpg");
});

test("extractStoragePath: decodes percent-encoded paths", () => {
  const url =
    "https://ref.supabase.co/storage/v1/object/sign/shift-photos/s%201/a%20b.jpg?token=x";
  assert.equal(extractStoragePath(url), "s 1/a b.jpg");
});

test("extractStoragePath: returns null for non-signed URLs and data URLs", () => {
  assert.equal(extractStoragePath(DATA_URL), null);
  assert.equal(extractStoragePath("https://example.com/whatever.jpg"), null);
  assert.equal(extractStoragePath("shift123/abc.jpg"), null);
});

test("planPhotoUpdate: Storage OFF keeps a new image inline", () => {
  const plan = planPhotoUpdate([DATA_URL], { keepable: [], storageEnabled: false });
  assert.deepEqual(plan, [{ kind: "inline", dataUrl: DATA_URL }]);
});

test("planPhotoUpdate: Storage ON uploads a new image", () => {
  const plan = planPhotoUpdate([DATA_URL], { keepable: [], storageEnabled: true });
  assert.deepEqual(plan, [{ kind: "upload", dataUrl: DATA_URL }]);
});

test("planPhotoUpdate: keeps an existing photo whose path is on the entry", () => {
  const plan = planPhotoUpdate([SIGNED], {
    keepable: ["shift123/abc-def.jpg"],
    storageEnabled: true,
  });
  assert.deepEqual(plan, [{ kind: "keep", path: "shift123/abc-def.jpg" }]);
});

test("planPhotoUpdate: rejects a kept path NOT on the entry (anti-tamper)", () => {
  // A signed URL for someone else's object must not be attachable.
  const plan = planPhotoUpdate([SIGNED], {
    keepable: ["shift123/legit.jpg"],
    storageEnabled: true,
  });
  assert.deepEqual(plan, []);
});

test("planPhotoUpdate: keeps a raw stored path that's on the entry", () => {
  const plan = planPhotoUpdate(["shift123/abc.jpg"], {
    keepable: ["shift123/abc.jpg"],
    storageEnabled: true,
  });
  assert.deepEqual(plan, [{ kind: "keep", path: "shift123/abc.jpg" }]);
});

test("planPhotoUpdate: preserves order across mixed keep + new", () => {
  const plan = planPhotoUpdate([SIGNED, DATA_URL], {
    keepable: ["shift123/abc-def.jpg"],
    storageEnabled: true,
  });
  assert.deepEqual(plan, [
    { kind: "keep", path: "shift123/abc-def.jpg" },
    { kind: "upload", dataUrl: DATA_URL },
  ]);
});

test("planPhotoUpdate: skips non-strings and caps at MAX_PHOTOS", () => {
  const many = Array.from({ length: 7 }, () => DATA_URL);
  const plan = planPhotoUpdate([null, 42, ...many], {
    keepable: [],
    storageEnabled: false,
  });
  assert.equal(plan.length, MAX_PHOTOS);
  assert.ok(plan.every((a) => a.kind === "inline"));
});

test("planPhotoUpdate: oversized new image is dropped (not stored)", () => {
  const huge = "data:image/jpeg;base64," + "A".repeat(9_000_000);
  assert.deepEqual(planPhotoUpdate([huge], { keepable: [], storageEnabled: true }), []);
  assert.deepEqual(planPhotoUpdate([huge], { keepable: [], storageEnabled: false }), []);
});

test("planPhotoUpdate: non-array input yields an empty plan", () => {
  assert.deepEqual(planPhotoUpdate(null, { keepable: [], storageEnabled: true }), []);
  assert.deepEqual(planPhotoUpdate("nope", { keepable: [], storageEnabled: true }), []);
});
