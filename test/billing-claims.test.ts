// Tests for the pure billing/budget/claim helpers (src/lib/billing-claims.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { lineAmountCents, budgetSummary, toClaimCsv } from "../src/lib/billing-claims";

test("lineAmountCents: qty * unit, clamped non-negative + rounded", () => {
  assert.equal(lineAmountCents(3, 5000), 15000);
  assert.equal(lineAmountCents(0, 5000), 0);
  assert.equal(lineAmountCents(-2, 5000), 0);
});

test("budgetSummary: per-category allocated/spent/remaining + totals + uncategorised", () => {
  const { rows, totals } = budgetSummary(
    [
      { category: "core", allocatedCents: 100000 },
      { category: "capacity", allocatedCents: 50000 },
    ],
    [
      { category: "core", amountCents: 30000 },
      { category: "core", amountCents: 10000 },
      { category: null, amountCents: 5000 }, // → (uncategorised)
    ],
  );
  const core = rows.find((r) => r.category === "core")!;
  assert.equal(core.spentCents, 40000);
  assert.equal(core.remainingCents, 60000);
  const unc = rows.find((r) => r.category === "(uncategorised)")!;
  assert.equal(unc.spentCents, 5000);
  assert.equal(unc.remainingCents, -5000); // spend with no allocation
  assert.equal(totals.allocatedCents, 150000);
  assert.equal(totals.spentCents, 45000);
});

test("toClaimCsv: header + dollar formatting + CSV escaping", () => {
  const csv = toClaimCsv([
    {
      date: "2026-06-25T09:00:00.000Z",
      lineItemCode: "01_011_0107_1_1",
      description: 'Assistance, "daily" life',
      quantity: 2,
      unitPriceCents: 6655,
      amountCents: 13310,
      claimRef: "CLAIM-1",
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "Date,ItemNumber,Description,Quantity,UnitPrice,Total,ClaimRef");
  assert.ok(lines[1].startsWith("2026-06-25,01_011_0107_1_1,"));
  assert.ok(lines[1].includes('"Assistance, ""daily"" life"')); // escaped
  assert.ok(lines[1].includes("66.55"));
  assert.ok(lines[1].includes("133.10"));
});
