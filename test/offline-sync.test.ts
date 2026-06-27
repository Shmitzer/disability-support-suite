// Tests for the offline outbox / sync-engine core (src/lib/offline-sync.ts).
// All pure, deterministic — time is passed in, no Date.now()/IndexedDB.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enqueue,
  drainBatch,
  markSyncing,
  markSynced,
  markFailed,
  reconcile,
  backoffMs,
  mintIdempotencyKey,
  purgeSynced,
  summarise,
  compareOps,
  DEFAULT_RETRY,
  type OutboxOp,
} from "../src/lib/offline-sync";

type Enq = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  clientTs: number;
  deviceId: string;
};
const base = (over: Partial<Enq> & { id: string; entityId: string; clientTs: number }): Enq => ({
  action: "logEntry.create",
  entityType: "LogEntry",
  payload: {},
  deviceId: "dev1",
  ...over,
});

test("enqueue: assigns monotonic seq + stable idempotency key, status pending", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "a", entityId: "E1", clientTs: 100 }));
  q = enqueue(q, base({ id: "b", entityId: "E1", clientTs: 200 }));
  assert.equal(q[0].seq, 1);
  assert.equal(q[1].seq, 2);
  assert.equal(q[0].idempotencyKey, mintIdempotencyKey("dev1", "LogEntry", 1));
  assert.equal(q[0].status, "pending");
  assert.equal(q[0].attempts, 0);
});

test("compareOps: clientTs first, then seq", () => {
  const q = [
    enqueue([], base({ id: "a", entityId: "E1", clientTs: 200 }))[0],
    enqueue([], base({ id: "b", entityId: "E1", clientTs: 100 }))[0],
  ];
  const sorted = [...q].sort(compareOps);
  assert.equal(sorted[0].clientTs, 100);
});

test("backoffMs: exponential, capped, 1-based", () => {
  assert.equal(backoffMs(1), 2000);
  assert.equal(backoffMs(2), 4000);
  assert.equal(backoffMs(3), 8000);
  assert.equal(backoffMs(0), 0);
  assert.equal(backoffMs(99), DEFAULT_RETRY.maxMs); // capped
});

test("drainBatch: only due pending ops, deterministic order", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "a", entityType: "Shift", entityId: "S1", clientTs: 100 }));
  q = enqueue(q, base({ id: "b", entityType: "Shift", entityId: "S2", clientTs: 200 }));
  const batch = drainBatch(q, 1000);
  assert.deepEqual(batch.map((o) => o.id), ["a", "b"]); // different entities, both go
});

test("drainBatch: PER-ENTITY serialisation — clock-off can't beat clock-on", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "on", entityType: "Shift", entityId: "S1", clientTs: 100 }));
  q = enqueue(q, base({ id: "off", entityType: "Shift", entityId: "S1", clientTs: 200 }));
  // First drain: only the earliest op for S1.
  let batch = drainBatch(q, 1000);
  assert.deepEqual(batch.map((o) => o.id), ["on"]);
  // While "on" is syncing, S1 is blocked — "off" must NOT be drained.
  q = markSyncing(q, "on");
  batch = drainBatch(q, 1000);
  assert.deepEqual(batch.map((o) => o.id), []);
  // Once "on" syncs, "off" becomes eligible.
  q = markSynced(q, "on");
  batch = drainBatch(q, 1000);
  assert.deepEqual(batch.map((o) => o.id), ["off"]);
});

test("drainBatch: a not-yet-due op blocks its entity's successors", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "x1", entityId: "E1", clientTs: 100 }));
  q = enqueue(q, base({ id: "x2", entityId: "E1", clientTs: 200 }));
  q = markFailed(q, "x1", "net", 0); // schedules x1 retry at backoff(1)=2000
  const batch = drainBatch(q, 1000); // x1 not due yet (1000 < 2000) → x2 blocked
  assert.deepEqual(batch.map((o) => o.id), []);
  const later = drainBatch(q, 3000); // now x1 is due
  assert.deepEqual(later.map((o) => o.id), ["x1"]);
});

test("markFailed: retries with backoff, then goes terminal failed", () => {
  let q = enqueue([], base({ id: "a", entityId: "E1", clientTs: 100 }));
  for (let i = 1; i < DEFAULT_RETRY.maxAttempts; i++) {
    q = markFailed(q, "a", "net", 0);
    assert.equal(q[0].status, "pending");
    assert.equal(q[0].attempts, i);
  }
  q = markFailed(q, "a", "net", 0); // attempt == maxAttempts
  assert.equal(q[0].status, "failed");
  assert.equal(q[0].attempts, DEFAULT_RETRY.maxAttempts);
});

test("reconcile: duplicate is SUCCESS (idempotent no-op), rejected is terminal", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "dup", entityId: "E1", clientTs: 100 }));
  q = enqueue(q, base({ id: "bad", entityId: "E2", clientTs: 100 }));
  q = enqueue(q, base({ id: "net", entityId: "E3", clientTs: 100 }));

  q = reconcile(q, "dup", { kind: "duplicate" }, 0);
  q = reconcile(q, "bad", { kind: "rejected", error: "no permission" }, 0);
  q = reconcile(q, "net", { kind: "transient", error: "offline" }, 0);

  assert.equal(q.find((o) => o.id === "dup")!.status, "synced");
  assert.equal(q.find((o) => o.id === "bad")!.status, "failed");
  assert.equal(q.find((o) => o.id === "bad")!.lastError, "no permission");
  assert.equal(q.find((o) => o.id === "net")!.status, "pending"); // will retry
});

test("purgeSynced + summarise", () => {
  let q: OutboxOp[] = [];
  q = enqueue(q, base({ id: "a", entityId: "E1", clientTs: 100 }));
  q = enqueue(q, base({ id: "b", entityId: "E2", clientTs: 100 }));
  q = enqueue(q, base({ id: "c", entityId: "E3", clientTs: 100 }));
  q = markSynced(q, "a");
  q = markSyncing(q, "b");
  q = markFailed(q, "c", "x", 0);

  const s = summarise(q);
  assert.equal(s.synced, 1);
  assert.equal(s.syncing, 1);
  assert.equal(s.pending, 1); // c retried back to pending
  assert.equal(s.hasUnsynced, true);

  q = purgeSynced(q);
  assert.equal(q.length, 2);
  assert.ok(!q.some((o) => o.id === "a"));
});

test("idempotency key is stable across re-enqueue of the same logical op", () => {
  const k1 = mintIdempotencyKey("dev1", "Shift", 5);
  const k2 = mintIdempotencyKey("dev1", "Shift", 5);
  assert.equal(k1, k2);
  // and an explicit key survives enqueue (crash-recovery reuse)
  const q = enqueue([], { ...base({ id: "a", entityId: "E1", clientTs: 1 }), idempotencyKey: "kept" } as Enq & { idempotencyKey: string });
  assert.equal(q[0].idempotencyKey, "kept");
});
