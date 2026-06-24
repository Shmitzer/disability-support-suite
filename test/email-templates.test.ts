// Unit tests for the transactional email builders (src/lib/email-templates.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  subscriptionConfirmedEmail,
  subscriptionCancelledEmail,
} from "../src/lib/email-templates";

test("confirmed email: subject + org name in html and text", () => {
  const e = subscriptionConfirmedEmail({ orgName: "Acme Care" });
  assert.match(e.subject, /active/i);
  assert.match(e.html, /Acme Care/);
  assert.match(e.text, /Acme Care/);
});

test("cancelled email: subject + org name", () => {
  const e = subscriptionCancelledEmail({ orgName: "Acme Care" });
  assert.match(e.subject, /cancel/i);
  assert.match(e.html, /Acme Care/);
  assert.match(e.text, /Acme Care/);
});

test("org name is HTML-escaped in html, left raw in text", () => {
  const e = subscriptionConfirmedEmail({ orgName: `<script>"x"&` });
  assert.ok(!e.html.includes("<script>"), "no raw tag in html");
  assert.match(e.html, /&lt;script&gt;/);
  assert.match(e.html, /&amp;/);
  assert.match(e.html, /&quot;/);
  assert.ok(e.text.includes(`<script>"x"&`), "text stays raw (no markup to escape)");
});
