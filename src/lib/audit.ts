// audit.ts — recordAudit(): append one row to the cross-app audit trail (Rule 9),
// and make that trail TAMPER-EVIDENT via a hash chain.
//
// AuditLog is the broad account/billing/admin trail (ShiftEvent stays the per-shift
// compliance log). Two properties matter for an enterprise/compliance posture:
//
//   1. Append-only — enforced at the DB by RLS (SELECT + INSERT policies only, no
//      UPDATE/DELETE for clients; see prisma/sql/rls_policies.sql).
//   2. Tamper-EVIDENT — even a privileged actor who bypasses RLS (or edits Postgres
//      directly) can't alter history undetectably, because each row commits to the
//      one before it: hash = sha256(prevHash + canonical(payload)). Change or drop
//      any row and every later row's hash stops matching. verifyAuditChain() finds
//      the first break.
//
// There is one chain per organisationId (null-org = the platform/system chain), so
// each tenant's trail is independently verifiable and appends don't contend across
// tenants. Within a chain, appends are serialised by a Postgres advisory lock so
// two concurrent writes can't fork it.
//
// Best-effort by design: auditing must never break the action it records, so a write
// failure is logged, not thrown.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// The content of an audit entry that the hash commits to. `createdAt` is an ISO
// string so the hash is stable and reproducible (independent of Date objects /
// timezones).
export type AuditPayload = {
  action: string;
  actorId: string | null;
  organisationId: string | null;
  targetType: string;
  targetId: string;
  detail: unknown;
  createdAt: string;
};

// Deterministic JSON: object keys sorted recursively, so `detail` hashes the same
// regardless of property order. Arrays keep their order (it's significant).
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const body = Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",");
  return `{${body}}`;
}

// Canonical wire form of a payload — the exact bytes the chain hashes. Field order
// is fixed here; changing it would invalidate every existing hash, so don't.
export function canonicaliseAudit(p: AuditPayload): string {
  return stableStringify([
    p.action,
    p.actorId,
    p.organisationId,
    p.targetType,
    p.targetId,
    p.detail ?? null,
    p.createdAt,
  ]);
}

// The chain step: this row's hash from the previous row's hash + this payload.
// `prevHash` is null at the genesis of a chain. Pure — unit-tested without a DB.
export function chainHash(prevHash: string | null, payload: AuditPayload): string {
  return createHash("sha256")
    .update(`${prevHash ?? ""}\n${canonicaliseAudit(payload)}`)
    .digest("hex");
}

// A row as needed to verify a chain (payload + the stored hashes).
export type AuditChainRow = AuditPayload & { hash: string | null; prevHash: string | null };

// Recompute a chain in order and report the first row that doesn't line up — a
// recomputed-hash mismatch (row was edited) or a prevHash that doesn't equal the
// real predecessor (a row was inserted/removed/reordered). Pure: hand it rows in
// `seq` order. `brokenAt` is the position in the slice.
export function verifyChain(rows: AuditChainRow[]): {
  ok: boolean;
  brokenAt: number | null;
  reason?: string;
} {
  let prev: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.prevHash !== prev) {
      return { ok: false, brokenAt: i, reason: "prevHash does not match the preceding row" };
    }
    const expected = chainHash(prev, row);
    if (row.hash !== expected) {
      return { ok: false, brokenAt: i, reason: "hash does not match recomputed payload" };
    }
    prev = row.hash;
  }
  return { ok: true, brokenAt: null };
}

export async function recordAudit(entry: {
  action: string; // e.g. SUBSCRIPTION_UPDATED | ROLE_CHANGED | REPORT_APPROVED
  targetType: string; // e.g. "Organisation" | "Worker" | "ShiftReport"
  targetId: string;
  actorId?: string | null; // the Worker/User who did it (null = system)
  organisationId?: string | null;
  detail?: unknown; // extra context, stored as JSON
}): Promise<void> {
  try {
    const organisationId = entry.organisationId ?? null;
    const createdAt = new Date();
    const payload: AuditPayload = {
      action: entry.action,
      actorId: entry.actorId ?? null,
      organisationId,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: entry.detail ?? null,
      createdAt: createdAt.toISOString(),
    };

    // Serialise appends to THIS chain (per-org) and read its tail + insert inside
    // one transaction, so concurrent writers can't fork the chain. The advisory
    // lock key buckets by org ("" for the system chain).
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organisationId ?? ""}))`;

      const prev = await tx.auditLog.findFirst({
        where: { organisationId },
        orderBy: { seq: "desc" },
        select: { hash: true },
      });
      const prevHash = prev?.hash ?? null;
      const hash = chainHash(prevHash, payload);

      await tx.auditLog.create({
        data: {
          action: payload.action,
          actorId: payload.actorId,
          organisationId,
          targetType: payload.targetType,
          targetId: payload.targetId,
          detail: (entry.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          createdAt,
          prevHash,
          hash,
        },
      });
    });
  } catch (err) {
    console.error("recordAudit failed:", err);
  }
}

// Verify a stored chain end-to-end (one organisation's trail, or the system chain
// when organisationId is null/omitted). Reads rows in append order and replays the
// hash chain. Returns the verdict + the offending row when broken. Read-only.
export async function verifyAuditChain(
  organisationId: string | null = null,
): Promise<{
  ok: boolean;
  checked: number;
  brokenAt?: { seq: string; id: string };
  reason?: string;
}> {
  const rows = await prisma.auditLog.findMany({
    where: { organisationId },
    orderBy: { seq: "asc" },
    select: {
      id: true,
      seq: true,
      action: true,
      actorId: true,
      organisationId: true,
      targetType: true,
      targetId: true,
      detail: true,
      createdAt: true,
      hash: true,
      prevHash: true,
    },
  });

  const result = verifyChain(
    rows.map((r) => ({
      action: r.action,
      actorId: r.actorId,
      organisationId: r.organisationId,
      targetType: r.targetType,
      targetId: r.targetId,
      detail: r.detail ?? null,
      createdAt: r.createdAt.toISOString(),
      hash: r.hash,
      prevHash: r.prevHash,
    })),
  );

  if (result.ok) return { ok: true, checked: rows.length };
  const bad = rows[result.brokenAt!];
  return {
    ok: false,
    checked: rows.length,
    brokenAt: { seq: bad.seq.toString(), id: bad.id },
    reason: result.reason,
  };
}
