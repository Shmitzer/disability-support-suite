// Unit tests for the read-side photo resolution (src/lib/storage.ts). Pure of any
// network/DB; the no-Storage contract is what the shift page relies on to keep the
// inline-data-URL path working unchanged. Run with:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { signStoredPhotos, storageConfigured } from "../src/lib/storage";

test("signStoredPhotos: null in → null out", async () => {
  assert.equal(await signStoredPhotos(null), null);
});

test("signStoredPhotos: malformed JSON is returned unchanged", async () => {
  assert.equal(await signStoredPhotos("not json"), "not json");
});

// Without Storage configured, stored values must pass through verbatim — this is
// what guarantees the dev/sandbox (inline data URL) flow is unaffected.
test(
  "signStoredPhotos: without Storage, values pass through verbatim",
  { skip: storageConfigured() },
  async () => {
    const json = JSON.stringify(["shift1/a.jpg", "data:image/png;base64,xx"]);
    assert.equal(await signStoredPhotos(json), json);
  },
);
