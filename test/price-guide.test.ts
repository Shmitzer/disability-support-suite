// Tests for the NDIS price-guide importer (src/lib/price-guide.ts) + the NDIS
// bulk-upload claim CSV (src/lib/billing-claims.ts). All pure, no I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsvRows,
  dollarsToCents,
  parsePriceGuideCsv,
  priceCapCents,
  validateClaimLine,
  indexByCode,
  regionForState,
} from "../src/lib/price-guide";
import { toNdisBulkCsv, NDIS_BULK_HEADER } from "../src/lib/billing-claims";

// A small NDIA-shaped catalogue: quoted fields, $ and commas, a quote-only item,
// and an item with only a national price.
const SAMPLE = `Support Item Number,Support Item Name,Registration Group Name,Support Category Name,Unit,"ACT/NSW/QLD/VIC","NT/SA/TAS/WA",Remote,Very Remote,National,Quote,Type of Support
01_011_0107_1_1,"Assistance With Self-Care, Standard","Daily Activities","Assistance with Daily Life",H,$66.55,$66.55,"$93.17","$99.83",,N,Core
01_004_0107_1_1,"Assistance, Complex","Daily Activities","Assistance with Daily Life",H,"$1,017.00",,,,,Y,Core
14_xxx_0000_1_3,"Specialist Support Coordination","Support Coordination","Support Coordination",H,,,,,190.54,N,Capacity Building
`;

test("parseCsvRows: quotes, embedded commas, escaped quotes, trailing newline", () => {
  const rows = parseCsvRows('a,"b,c","d""e"\n1,2,3\n');
  assert.deepEqual(rows[0], ["a", "b,c", 'd"e']);
  assert.deepEqual(rows[1], ["1", "2", "3"]);
  assert.equal(rows.length, 2);
});

test("dollarsToCents: $, commas, blanks", () => {
  assert.equal(dollarsToCents("66.55"), 6655);
  assert.equal(dollarsToCents("$1,017.00"), 101700);
  assert.equal(dollarsToCents(""), null);
  assert.equal(dollarsToCents("  "), null);
  assert.equal(dollarsToCents("n/a"), null);
});

test("parsePriceGuideCsv: maps fuzzy headers → SupportItems with cents caps", () => {
  const items = parsePriceGuideCsv(SAMPLE);
  assert.equal(items.length, 3);
  const a = indexByCode(items).get("01_011_0107_1_1")!;
  assert.equal(a.name, "Assistance With Self-Care, Standard");
  assert.equal(a.unit, "H");
  assert.equal(a.priceCapsCents.act_nsw_qld_vic, 6655);
  assert.equal(a.priceCapsCents.remote, 9317);
  assert.equal(a.priceCapsCents.national, null);
  assert.equal(a.quote, false);
});

test("priceCapCents: falls back to national when region cap absent", () => {
  const idx = indexByCode(parsePriceGuideCsv(SAMPLE));
  const sc = idx.get("14_xxx_0000_1_3")!;
  // national-only item: any region resolves to the national cap
  assert.equal(priceCapCents(sc, "act_nsw_qld_vic"), 19054);
  assert.equal(priceCapCents(sc, "remote"), 19054);
});

test("validateClaimLine: over-cap rejected, within ok, quote + unknown handled", () => {
  const idx = indexByCode(parsePriceGuideCsv(SAMPLE));
  const std = idx.get("01_011_0107_1_1");
  const quote = idx.get("01_004_0107_1_1");

  assert.deepEqual(validateClaimLine(std, "act_nsw_qld_vic", 6655), { ok: true, capCents: 6655 });
  const over = validateClaimLine(std, "act_nsw_qld_vic", 7000);
  assert.equal(over.ok, false);
  assert.equal(over.reason, "over_cap");
  assert.equal(over.overByCents, 345);

  assert.equal(validateClaimLine(quote, "remote", 200000).ok, true); // quote: can't auto-validate
  assert.equal(validateClaimLine(quote, "remote", 200000).reason, "quote_required");

  const unknown = validateClaimLine(undefined, "national", 100);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, "unknown_item");
});

test("regionForState: maps states to price-cap regions", () => {
  assert.equal(regionForState("nsw"), "act_nsw_qld_vic");
  assert.equal(regionForState("WA"), "nt_sa_tas_wa");
  assert.equal(regionForState("ZZ"), "national");
});

test("toNdisBulkCsv: exact 16-col header + GST default P2 + escaping", () => {
  const csv = toNdisBulkCsv("4-050-1234-5", [
    {
      ndisNumber: "430000001",
      supportsDeliveredFrom: "2026-06-01T00:00:00.000Z",
      supportsDeliveredTo: "2026-06-01T00:00:00.000Z",
      supportNumber: "01_011_0107_1_1",
      claimReference: "REF,1",
      quantity: 2,
      hours: 2,
      unitPriceCents: 6655,
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], NDIS_BULK_HEADER.join(","));
  assert.equal(NDIS_BULK_HEADER.length, 16);
  assert.ok(lines[1].startsWith("4-050-1234-5,430000001,2026-06-01,2026-06-01,01_011_0107_1_1,"));
  assert.ok(lines[1].includes('"REF,1"')); // escaped comma
  assert.ok(lines[1].includes("66.55"));
  assert.ok(lines[1].includes(",P2,")); // GST default
});
