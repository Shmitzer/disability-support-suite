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

// --- Global daily spend cap + budget alarm ---------------------------------
//
// The per-identifier throttle above stops ONE account hammering the API. This is
// the other half: a GLOBAL ceiling on paid LLM calls per UTC day across the whole
// platform, so a pricing mistake / abuse spike / runaway loop can't run up an
// unbounded Gemini bill. It is the app-side complement to the provider-side budget
// (AI Studio), giving us a cap we control in code and an early alarm before it bites.
//
//   • Enforced only when Upstash is configured (same env gate as the throttle), so
//     dev/sandbox is uncapped and unchanged.
//   • Cap = LLM_DAILY_CAP (default 2000 calls/day); set 0 to disable enforcement.
//   • Alarm fires once usage crosses LLM_DAILY_ALARM_FRACTION (default 0.8) of the
//     cap — emitted as a PostHog server event so it can page/notify.
//   • FAILS OPEN on a limiter outage (an Upstash hiccup must not take note
//     generation down); under normal operation the counter does the capping.

const DAILY_CAP = Number(process.env.LLM_DAILY_CAP ?? 2000);
const ALARM_FRACTION = Number(process.env.LLM_DAILY_ALARM_FRACTION ?? 0.8);

export type SpendCapResult = {
  allowed: boolean;
  count: number; // calls so far today (0 when unconfigured/disabled)
  cap: number; // 0 = disabled
  alarm: boolean; // true on the request that first crosses the alarm threshold
};

function uncapped(): SpendCapResult {
  return { allowed: true, count: 0, cap: 0, alarm: false };
}

// Increment the global daily counter and decide whether this paid call is allowed.
// One pipeline round-trip: INCR the day key + set a 48h TTL on first hit (so the
// key self-expires and we never accumulate forever). Emits a one-shot budget alarm
// via PostHog when usage first crosses the alarm fraction.
export async function checkSpendCap(): Promise<SpendCapResult> {
  if (!url || !token) return uncapped(); // not configured → no global cap (dev/sandbox)
  if (!(DAILY_CAP > 0)) return uncapped(); // explicitly disabled

  const day = new Date().toISOString().slice(0, 10); // UTC day, YYYY-MM-DD
  const key = `rl:spend:${day}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, 172800, "NX"], // 48h TTL, only if unset
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash responded ${res.status}`);

    const data = (await res.json()) as Array<{ result?: unknown }>;
    const count = Number(data?.[0]?.result ?? 0);
    const allowed = count <= DAILY_CAP;
    // Alarm exactly once: on the request that first reaches the threshold count.
    const threshold = Math.floor(DAILY_CAP * ALARM_FRACTION);
    const alarm = count === threshold || (!allowed && count === DAILY_CAP + 1);

    if (alarm) {
      // Best-effort, never blocks the request path. Dynamic import keeps posthog-node
      // out of the hot path when analytics is disabled.
      void (async () => {
        try {
          const { captureServerEvent } = await import("@/lib/analytics");
          await captureServerEvent("system", "llm_budget_alarm", {
            count,
            cap: DAILY_CAP,
            day,
            breached: !allowed,
          });
        } catch {
          /* analytics off or import failed — the console line below still lands */
        }
      })();
      console.warn(
        `[budget] LLM daily usage ${count}/${DAILY_CAP} (${day})` +
          (allowed ? " — alarm threshold crossed" : " — HARD CAP REACHED, blocking"),
      );
    }

    return { allowed, count, cap: DAILY_CAP, alarm };
  } catch (err) {
    // Fail open: a limiter outage must not break note generation.
    console.error("spend cap check failed (allowing request):", err);
    return uncapped();
  }
}
