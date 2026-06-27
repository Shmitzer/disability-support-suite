// med-authorisation.ts — the hard-gated medication / restrictive-practice
// authorisation state machine (Phase H, docs/MED_VERIFICATION_SPEC.md §2).
//
// A medication profile (or RP plan) is only actionable by support workers once it
// reaches ACTIVE, and it can only get there by passing EVERY gate in order:
//
//   DRAFT → PENDING_BSP → PENDING_COMMISSION → PENDING_GUARDIAN → ACTIVE
//                                            ↘ DECLINED (terminal, locks the record)
//
// This module is the single source of truth for the legal transitions. It is PURE
// (no I/O) so it can be unit-tested exhaustively and reused by the server actions.
// The SAME transition table is enforced at the DB level by a trigger in
// prisma/sql/medication.sql, so a direct write can't skip a stage even if it
// bypasses the app (the spec's "DB-enforced gate, not a UI checkbox").
//
// LEGAL-GATED, DUMMY DATA ONLY until the lawyer + behaviour-support practitioner
// clear the feature (see the spec). No real authorisation chains yet.

export const MED_AUTH_STATUSES = [
  "DRAFT",
  "PENDING_BSP",
  "PENDING_COMMISSION",
  "PENDING_GUARDIAN",
  "ACTIVE",
  "DECLINED",
] as const;

export type MedAuthStatus = (typeof MED_AUTH_STATUSES)[number];

// Every record can be DECLINED from any non-terminal stage (a decline locks it and
// notifies the coordinator). Otherwise progress is strictly one forward step at a
// time — no skipping. ACTIVE may still be DECLINED later (a revocation). DECLINED is
// terminal.
const FORWARD: Record<MedAuthStatus, MedAuthStatus | null> = {
  DRAFT: "PENDING_BSP",
  PENDING_BSP: "PENDING_COMMISSION",
  PENDING_COMMISSION: "PENDING_GUARDIAN",
  PENDING_GUARDIAN: "ACTIVE",
  ACTIVE: null,
  DECLINED: null,
};

export function isMedAuthStatus(s: string): s is MedAuthStatus {
  return (MED_AUTH_STATUSES as readonly string[]).includes(s);
}

// The set of statuses a record may legally move to from `from` (excluding a no-op
// stay). DECLINED is reachable from any non-terminal stage; the forward step is the
// next stage in the chain.
export function allowedTransitions(from: MedAuthStatus): MedAuthStatus[] {
  if (from === "DECLINED") return []; // terminal — locked
  const out: MedAuthStatus[] = [];
  const fwd = FORWARD[from];
  if (fwd) out.push(fwd);
  out.push("DECLINED"); // any live record can be declined
  return out;
}

// Is moving from → to a legal transition? A no-op (from === to) is allowed (idempotent
// re-save); anything else must be in the allowed set.
export function canTransition(from: MedAuthStatus, to: MedAuthStatus): boolean {
  if (from === to) return true;
  return allowedTransitions(from).includes(to);
}

// The next forward stage, or null at the end of the chain / once terminal.
export function nextStage(from: MedAuthStatus): MedAuthStatus | null {
  return FORWARD[from];
}

// Only ACTIVE records are actionable by support workers / visible in a shift view.
// Everything else is draft/pending and coordinator-only (spec §2).
export function isActionable(status: MedAuthStatus): boolean {
  return status === "ACTIVE";
}

// A terminal status can never transition again.
export function isTerminal(status: MedAuthStatus): boolean {
  return status === "DECLINED";
}
