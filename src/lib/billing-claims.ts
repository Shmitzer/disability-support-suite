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
