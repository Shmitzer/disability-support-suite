// billing-claims.ts — pure money/budget/claim helpers (#8/#13). Money is integer
// cents everywhere. The NDIS bulk-payment template mapping is left as a later refinement;
// toClaimCsv produces a clean generic claim file. Pure + unit-tested.

export function lineAmountCents(quantity: number, unitPriceCents: number): number {
  return Math.max(0, Math.round(quantity)) * Math.max(0, Math.round(unitPriceCents));
}

export type BudgetLine = { category: string; allocatedCents: number };
export type SpendLine = { category?: string | null; amountCents: number };
export type BudgetRow = { category: string; allocatedCents: number; spentCents: number; remainingCents: number };

// Per-category allocated vs spent vs remaining (+ an "(uncategorised)" row for spend
// with no category), and totals.
export function budgetSummary(
  allocations: BudgetLine[],
  spends: SpendLine[],
): { rows: BudgetRow[]; totals: { allocatedCents: number; spentCents: number; remainingCents: number } } {
  const map = new Map<string, BudgetRow>();
  for (const a of allocations) {
    const r = map.get(a.category) ?? { category: a.category, allocatedCents: 0, spentCents: 0, remainingCents: 0 };
    r.allocatedCents += a.allocatedCents;
    map.set(a.category, r);
  }
  for (const s of spends) {
    const key = s.category || "(uncategorised)";
    const r = map.get(key) ?? { category: key, allocatedCents: 0, spentCents: 0, remainingCents: 0 };
    r.spentCents += s.amountCents;
    map.set(key, r);
  }
  const rows = [...map.values()].map((r) => ({ ...r, remainingCents: r.allocatedCents - r.spentCents }));
  const totals = rows.reduce(
    (t, r) => ({
      allocatedCents: t.allocatedCents + r.allocatedCents,
      spentCents: t.spentCents + r.spentCents,
      remainingCents: t.remainingCents + r.remainingCents,
    }),
    { allocatedCents: 0, spentCents: 0, remainingCents: 0 },
  );
  return { rows, totals };
}

export type ClaimItem = {
  date: string; // ISO
  lineItemCode?: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  claimRef?: string | null;
};

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const dollars = (cents: number) => (cents / 100).toFixed(2);

// A generic claim CSV. (NDIS bulk-upload template mapping is a later refinement.)
export function toClaimCsv(items: ClaimItem[]): string {
  const header = ["Date", "ItemNumber", "Description", "Quantity", "UnitPrice", "Total", "ClaimRef"];
  const rows = items.map((it) =>
    [
      it.date.slice(0, 10),
      it.lineItemCode ?? "",
      it.description,
      it.quantity,
      dollars(it.unitPriceCents),
      dollars(it.amountCents),
      it.claimRef ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

// ---- NDIS bulk payment request (the real NDIA upload template) ----------------
// The NDIA "bulk payment request" CSV (no public API; a fixed 16-column template
// the provider uploads to the myplace provider portal). This realises the mapping
// that toClaimCsv() left as a later refinement. GST is "P2" (GST-free) for the vast
// majority of NDIS supports; callers override per line where needed.
export type NdisClaimLine = {
  ndisNumber: string; // participant NDIS number
  supportsDeliveredFrom: string; // ISO date
  supportsDeliveredTo: string; // ISO date
  supportNumber: string; // support item code from the price guide
  claimReference?: string | null;
  quantity: number;
  hours?: number | null; // for hourly (unit "H") supports
  unitPriceCents: number;
  gstCode?: string | null; // "P1" taxable | "P2" GST-free (default) | "P5" out-of-scope
  authorisedBy?: string | null;
  participantApproved?: string | null;
  inKindFundingProgram?: string | null;
  claimType?: string | null; // "" standard | "CANC" cancellation | "REPW" report writing | "TRAN" transport
  cancellationReason?: string | null;
  abn?: string | null; // ABN of support provider
};

// NDIA bulk upload template header — exact order matters for the portal import.
export const NDIS_BULK_HEADER = [
  "RegistrationNumber",
  "NDISNumber",
  "SupportsDeliveredFrom",
  "SupportsDeliveredTo",
  "SupportNumber",
  "ClaimReference",
  "Quantity",
  "Hours",
  "UnitPrice",
  "GSTCode",
  "AuthorisedBy",
  "ParticipantApproved",
  "InKindFundingProgram",
  "ClaimType",
  "CancellationReason",
  "ABN of Support Provider",
] as const;

export function toNdisBulkCsv(registrationNumber: string, lines: NdisClaimLine[]): string {
  const rows = lines.map((l) =>
    [
      registrationNumber,
      l.ndisNumber,
      l.supportsDeliveredFrom.slice(0, 10),
      l.supportsDeliveredTo.slice(0, 10),
      l.supportNumber,
      l.claimReference ?? "",
      Math.max(0, l.quantity),
      l.hours != null ? l.hours : "",
      dollars(l.unitPriceCents),
      l.gstCode ?? "P2",
      l.authorisedBy ?? "",
      l.participantApproved ?? "",
      l.inKindFundingProgram ?? "",
      l.claimType ?? "",
      l.cancellationReason ?? "",
      l.abn ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [NDIS_BULK_HEADER.join(","), ...rows].join("\n");
}
