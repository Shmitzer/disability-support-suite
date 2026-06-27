// price-guide.ts — AU NDIS Support Catalogue (price guide) importer + lookup.
//
// Phase 2 (budgets/claims). PURE + unit-tested, no I/O, no PII, no participant
// data — this is national REFERENCE data (the NDIA's periodically-published
// "Support Catalogue" CSV; there is no public API, hence an importer). Money is
// integer cents everywhere, consistent with billing-claims.ts.
//
// The NDIA spreadsheet has no stable header casing/order across releases, so the
// parser maps headers fuzzily (case/space/punctuation-insensitive) rather than by
// fixed column index. Unknown columns are ignored; missing price columns parse to
// null (e.g. quote-only items).

// The NDIA price-cap geography. The catalogue publishes one combined column for the
// metro states and a second for the lower-population states, plus the remoteness
// loadings and a national column for non-geographic items.
export type PriceRegion =
  | "act_nsw_qld_vic"
  | "nt_sa_tas_wa"
  | "remote"
  | "very_remote"
  | "national";

export const PRICE_REGIONS: PriceRegion[] = [
  "act_nsw_qld_vic",
  "nt_sa_tas_wa",
  "remote",
  "very_remote",
  "national",
];

// Map an AU state/territory code to its base (non-remote) price-cap region.
export function regionForState(state: string): PriceRegion {
  const s = state.trim().toUpperCase();
  if (["ACT", "NSW", "QLD", "VIC"].includes(s)) return "act_nsw_qld_vic";
  if (["NT", "SA", "TAS", "WA"].includes(s)) return "nt_sa_tas_wa";
  return "national";
}

export type SupportItem = {
  code: string; // Support Item Number, e.g. "01_011_0107_1_1"
  name: string; // Support Item Name
  registrationGroup?: string | null; // Registration Group Name
  supportCategory?: string | null; // Support Category Name
  unit?: string | null; // "H" (hour), "E" (each), "D" (day), "WK", "YR", "MON"
  // Price caps in integer cents per region. null = not published for that region.
  priceCapsCents: Partial<Record<PriceRegion, number | null>>;
  quote: boolean; // "Quote" required (no fixed cap; price by quote)
  type?: string | null; // Type of Support ("Core", "Capacity Building", "Capital")
};

// ---- CSV parsing (RFC-4180-ish: quoted fields, "" escapes, CRLF/LF) -----------
export function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const text = csv.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // trailing field / row (file without final newline)
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Normalise a header cell to a comparison key: lowercase, strip non-alphanumerics.
function headerKey(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Dollar string ("193.99", "$1,234.50", "") → integer cents, or null if blank/NaN.
export function dollarsToCents(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// Header aliases → our field. Covers the common NDIA catalogue / PACE variants.
const PRICE_COL_ALIASES: Record<string, PriceRegion> = {
  actnswqldvic: "act_nsw_qld_vic",
  actnswqldvicprice: "act_nsw_qld_vic",
  ntsataswa: "nt_sa_tas_wa",
  ntsataswaprice: "nt_sa_tas_wa",
  remote: "remote",
  remoteprice: "remote",
  veryremote: "very_remote",
  veryremoteprice: "very_remote",
  national: "national",
  nationalprice: "national",
};

function findIndex(keys: string[], ...aliases: string[]): number {
  for (const a of aliases) {
    const i = keys.indexOf(a);
    if (i !== -1) return i;
  }
  return -1;
}

function isQuote(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === "y" || s === "yes" || s === "true" || s === "quote";
}

// Parse the NDIA Support Catalogue CSV into SupportItems. Rows without a support
// item number are skipped (header/notes/blank lines).
export function parsePriceGuideCsv(csv: string): SupportItem[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const keys = rows[0].map(headerKey);

  const codeIdx = findIndex(keys, "supportitemnumber", "supportitem", "itemnumber", "supportnumber");
  const nameIdx = findIndex(keys, "supportitemname", "supportitemnamepace", "itemname");
  const groupIdx = findIndex(keys, "registrationgroupname", "registrationgroup");
  const categoryIdx = findIndex(keys, "supportcategoryname", "supportcategorynamepace", "supportcategory");
  const unitIdx = findIndex(keys, "unit");
  const quoteIdx = findIndex(keys, "quote", "quoterequired");
  const typeIdx = findIndex(keys, "typeofsupport", "supporttype", "type");

  const priceIdx: Array<{ region: PriceRegion; idx: number }> = [];
  keys.forEach((k, idx) => {
    const region = PRICE_COL_ALIASES[k];
    if (region) priceIdx.push({ region, idx });
  });

  if (codeIdx === -1) return [];

  const items: SupportItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const code = (row[codeIdx] ?? "").trim();
    if (!code) continue;
    const priceCapsCents: Partial<Record<PriceRegion, number | null>> = {};
    for (const { region, idx } of priceIdx) {
      priceCapsCents[region] = dollarsToCents(row[idx] ?? "");
    }
    items.push({
      code,
      name: (nameIdx !== -1 ? row[nameIdx] : "")?.trim() ?? "",
      registrationGroup: groupIdx !== -1 ? row[groupIdx]?.trim() || null : null,
      supportCategory: categoryIdx !== -1 ? row[categoryIdx]?.trim() || null : null,
      unit: unitIdx !== -1 ? row[unitIdx]?.trim() || null : null,
      priceCapsCents,
      quote: quoteIdx !== -1 ? isQuote(row[quoteIdx] ?? "") : false,
      type: typeIdx !== -1 ? row[typeIdx]?.trim() || null : null,
    });
  }
  return items;
}

// ---- Lookup + claim-line validation -------------------------------------------

// The published cap for an item in a region, falling back to the national column
// when a geographic cap isn't published. null = no cap (quote item / unknown).
export function priceCapCents(item: SupportItem, region: PriceRegion): number | null {
  const direct = item.priceCapsCents[region];
  if (direct != null) return direct;
  const national = item.priceCapsCents.national;
  return national != null ? national : null;
}

export type ClaimLineCheck = {
  ok: boolean;
  reason?: "unknown_item" | "quote_required" | "over_cap" | "no_cap";
  capCents: number | null;
  overByCents?: number;
};

// Validate a claim line's unit price against the guide. Quote items can't be
// auto-validated (price is by negotiated quote). Over-cap is the load-bearing
// compliance check — claiming above the cap is rejected by the NDIA.
export function validateClaimLine(
  item: SupportItem | undefined | null,
  region: PriceRegion,
  unitPriceCents: number,
): ClaimLineCheck {
  if (!item) return { ok: false, reason: "unknown_item", capCents: null };
  if (item.quote) return { ok: true, reason: "quote_required", capCents: null };
  const cap = priceCapCents(item, region);
  if (cap == null) return { ok: true, reason: "no_cap", capCents: null };
  if (unitPriceCents > cap) {
    return { ok: false, reason: "over_cap", capCents: cap, overByCents: unitPriceCents - cap };
  }
  return { ok: true, capCents: cap };
}

// Index a catalogue by code for O(1) lookup.
export function indexByCode(items: SupportItem[]): Map<string, SupportItem> {
  const m = new Map<string, SupportItem>();
  for (const it of items) m.set(it.code, it);
  return m;
}
