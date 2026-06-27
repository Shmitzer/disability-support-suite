// offline-sync.ts — the offline outbox / sync-engine CORE (Phase 2.2). PURE +
// unit-tested: no IndexedDB, no service worker, no network, no Date.now() (time is
// always passed in). This is the deterministic brain the later thin bindings drive —
// the IndexedDB store persists this state, the service worker / reconnect handler
// calls drainBatch() then replays each op through its server action.
//
// Why a core like this exists at all: the app's writes are idempotent server actions
// (client-generated @unique idempotencyKey, server dedupes a replay to a no-op — see
// quick-shift-actions.ts / log-actions.ts). That makes REPLAY safe; what's left is
// the hard part this file owns — durable ordering, per-entity serialisation, retry
// with backoff, terminal-failure handling, and the pending→syncing→synced/failed
// state machine the UI badges read. All deterministic so it's testable headless.

export type OpStatus = "pending" | "syncing" | "synced" | "failed";

// One queued mutation. `idempotencyKey` is minted once at enqueue and is STABLE
// across every retry of this op — that's what makes a replay a server-side no-op.
export type OutboxOp = {
  id: string; // local op id (stable, unique within the device)
  action: string; // the server action / route to replay, e.g. "logEntry.create"
  entityType: string; // "Shift" | "LogEntry" | … — used for per-entity ordering
  entityId: string; // the logical entity this op mutates (groups ordering)
  idempotencyKey: string; // client-generated; the server's @unique dedupe key
  payload: unknown; // opaque to the engine; the replayer knows its shape
  clientTs: number; // when the user performed it (epoch ms) — primary sort key
  seq: number; // monotonic per-device tiebreaker for equal clientTs
  status: OpStatus;
  attempts: number; // failed sync attempts so far
  lastError?: string | null;
  nextAttemptAt: number; // epoch ms; an op is eligible to sync once now >= this
};

export type RetryPolicy = {
  baseMs: number; // first backoff step
  maxMs: number; // backoff ceiling
  maxAttempts: number; // after this many failures the op goes terminal "failed"
};

export const DEFAULT_RETRY: RetryPolicy = { baseMs: 2000, maxMs: 5 * 60_000, maxAttempts: 8 };

// Deterministic exponential backoff (no jitter — keeps it testable; the SW/Background
// Sync layer adds its own scheduling slack). attempt is 1-based.
export function backoffMs(attempt: number, policy: RetryPolicy = DEFAULT_RETRY): number {
  if (attempt <= 0) return 0;
  const grown = policy.baseMs * 2 ** (attempt - 1);
  return Math.min(policy.maxMs, grown);
}

// Stable idempotency key for an op. Deterministic from device + entity + seq so the
// SAME logical op always carries the SAME key, even if re-enqueued after a crash.
export function mintIdempotencyKey(deviceId: string, entityType: string, seq: number): string {
  return `${deviceId}:${entityType}:${seq}`;
}

export type EnqueueInput = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  clientTs: number;
  deviceId: string;
  idempotencyKey?: string; // caller may supply one (e.g. reuse an existing key)
};

// Append an op. `seq` is assigned monotonically from the queue's current max so
// ordering is stable and per-device unique. Returns a NEW queue (immutable).
export function enqueue(queue: OutboxOp[], input: EnqueueInput): OutboxOp[] {
  const seq = queue.reduce((m, o) => Math.max(m, o.seq), 0) + 1;
  const op: OutboxOp = {
    id: input.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    idempotencyKey: input.idempotencyKey ?? mintIdempotencyKey(input.deviceId, input.entityType, seq),
    payload: input.payload,
    clientTs: input.clientTs,
    seq,
    status: "pending",
    attempts: 0,
    lastError: null,
    nextAttemptAt: 0,
  };
  return [...queue, op];
}

// Deterministic total order: by when the user did it, then per-device seq.
export function compareOps(a: OutboxOp, b: OutboxOp): number {
  return a.clientTs - b.clientTs || a.seq - b.seq;
}

// The ops to attempt right now. Rules:
//   • only "pending" ops whose nextAttemptAt has arrived,
//   • PER-ENTITY SERIALISATION: an entity with an op currently "syncing", or with an
//     earlier "failed"/not-yet-due op, is BLOCKED — we never replay a later mutation
//     for an entity before its earlier ones land (a clock-off must not beat its
//     clock-on). Different entities sync in parallel.
//   • at most `limit` ops.
export function drainBatch(queue: OutboxOp[], now: number, limit = 25): OutboxOp[] {
  const ordered = [...queue].sort(compareOps);
  const blockedEntities = new Set<string>();
  // First pass: any in-flight or terminally-failed op blocks its entity entirely.
  for (const op of ordered) {
    if (op.status === "syncing" || op.status === "failed") blockedEntities.add(op.entityId);
  }
  const batch: OutboxOp[] = [];
  const claimed = new Set<string>(); // one op per entity per drain (preserve order)
  for (const op of ordered) {
    if (batch.length >= limit) break;
    if (op.status !== "pending") continue;
    if (op.nextAttemptAt > now) {
      blockedEntities.add(op.entityId); // a not-yet-due op blocks its successors too
      continue;
    }
    if (blockedEntities.has(op.entityId) || claimed.has(op.entityId)) continue;
    claimed.add(op.entityId);
    batch.push(op);
  }
  return batch;
}

function patch(queue: OutboxOp[], id: string, fields: Partial<OutboxOp>): OutboxOp[] {
  return queue.map((o) => (o.id === id ? { ...o, ...fields } : o));
}

export function markSyncing(queue: OutboxOp[], id: string): OutboxOp[] {
  return patch(queue, id, { status: "syncing" });
}

// A successful replay (incl. a server idempotent no-op, see reconcileConflict).
export function markSynced(queue: OutboxOp[], id: string): OutboxOp[] {
  return patch(queue, id, { status: "synced", lastError: null });
}

// A failed attempt. Schedules a backoff retry, or goes terminal "failed" once the
// policy's attempt budget is spent (the UI surfaces these for manual resolution).
export function markFailed(
  queue: OutboxOp[],
  id: string,
  error: string,
  now: number,
  policy: RetryPolicy = DEFAULT_RETRY,
): OutboxOp[] {
  const op = queue.find((o) => o.id === id);
  if (!op) return queue;
  const attempts = op.attempts + 1;
  if (attempts >= policy.maxAttempts) {
    return patch(queue, id, { status: "failed", attempts, lastError: error });
  }
  return patch(queue, id, {
    status: "pending",
    attempts,
    lastError: error,
    nextAttemptAt: now + backoffMs(attempts, policy),
  });
}

// Conflict reconciliation. Because writes are idempotent creates keyed by
// idempotencyKey, the only "conflict" the server reports is "I already have this"
// (a duplicate-key / 409). That is SUCCESS for an outbox — the mutation is durable
// server-side — so a duplicate resolves to "synced", never an error. A genuine
// rejection (validation/permission) is a terminal failure, not a retry.
export type ReplayOutcome =
  | { kind: "ok" }
  | { kind: "duplicate" } // server already has this idempotencyKey
  | { kind: "rejected"; error: string } // permanent: validation/permission
  | { kind: "transient"; error: string }; // network/5xx: retry with backoff

export function reconcile(
  queue: OutboxOp[],
  id: string,
  outcome: ReplayOutcome,
  now: number,
  policy: RetryPolicy = DEFAULT_RETRY,
): OutboxOp[] {
  switch (outcome.kind) {
    case "ok":
    case "duplicate":
      return markSynced(queue, id);
    case "rejected":
      return patch(queue, id, { status: "failed", attempts: queue.find((o) => o.id === id)?.attempts ?? 0, lastError: outcome.error });
    case "transient":
      return markFailed(queue, id, outcome.error, now, policy);
  }
}

// Drop synced ops once they're durable server-side — keeps the local store bounded.
export function purgeSynced(queue: OutboxOp[]): OutboxOp[] {
  return queue.filter((o) => o.status !== "synced");
}

// What the UI badges read.
export type SyncSummary = {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
  /** true when there is unsynced work that is NOT terminally failed. */
  hasUnsynced: boolean;
};

export function summarise(queue: OutboxOp[]): SyncSummary {
  const s: SyncSummary = { pending: 0, syncing: 0, synced: 0, failed: 0, total: queue.length, hasUnsynced: false };
  for (const o of queue) s[o.status]++;
  s.hasUnsynced = s.pending > 0 || s.syncing > 0;
  return s;
}
