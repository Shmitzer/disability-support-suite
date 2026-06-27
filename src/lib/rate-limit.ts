// rate-limit.ts — abuse throttle for the LLM-backed endpoints (Phase 0 gate item).
// Backed by Upstash Redis over its REST API, so it works in any serverless/edge
// runtime with no SDK and no persistent connection.
//
// Env-gated, matching the other optional integrations (storage/analytics): without
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN this no-ops and every request is
// allowed, so dev/sandbox behaviour is unchanged.
//
// FAIL-OPEN by design: a limiter outage must never take down note generation. This
// is an *abuse throttle*, not the spend ceiling — the hard cost cap is enforced
// provider-side (AI Studio budget). Here we just stop one account hammering the API.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Defaults: 20 requests/hour/identifier (overridable via env).
const LIMIT = Number(process.env.RATE_LIMIT_MAX ?? 20);
const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 3600);

export function rateLimitConfigured(): boolean {
  return Boolean(url && token);
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // seconds until the window resets (for a Retry-After header)
};

function allow(): RateLimitResult {
  return { allowed: true, limit: LIMIT, remaining: LIMIT, retryAfter: 0 };
}

// Fixed-window counter: INCR the per-identifier key, and on the first hit of a new
// window set its TTL (EXPIRE ... NX = only if no TTL yet). Both run in one pipeline
// round-trip so the window can't leak a key with no expiry.
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!url || !token) return allow(); // not configured → no-op (dev/sandbox)

  const key = `rl:${identifier}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, WINDOW_SECONDS, "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash responded ${res.status}`);

    // Pipeline result shape: [{ result: <count> }, { result: 0|1 }]
    const data = (await res.json()) as Array<{ result?: unknown }>;
    const count = Number(data?.[0]?.result ?? 0);
    const remaining = Math.max(0, LIMIT - count);

    return {
      allowed: count <= LIMIT,
      limit: LIMIT,
      remaining,
      retryAfter: count <= LIMIT ? 0 : WINDOW_SECONDS,
    };
  } catch (err) {
    // Fail open: never let a limiter hiccup break the core feature.
    console.error("rate limit check failed (allowing request):", err);
    return allow();
  }
}
