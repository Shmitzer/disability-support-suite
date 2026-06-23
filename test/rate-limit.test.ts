// Unit tests for src/lib/rate-limit.ts. These cover the dev/sandbox contract: with
// no Upstash env configured the limiter must report unconfigured and allow every
// request (fail-open), so note generation behaves exactly as before. Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, rateLimitConfigured } from "../src/lib/rate-limit";

const configured = rateLimitConfigured();

test("rateLimitConfigured: false without Upstash env", { skip: configured }, () => {
  assert.equal(rateLimitConfigured(), false);
});

test(
  "checkRateLimit: allows and reports full remaining when unconfigured",
  { skip: configured },
  async () => {
    const result = await checkRateLimit("test-user");
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, result.limit);
    assert.equal(result.retryAfter, 0);
  },
);
