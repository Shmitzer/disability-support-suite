// reporting.ts — pure helpers for #10 reporting/analytics + CSV exports. No I/O;
// the DB-backed stats/exports live in reporting-actions.ts. Unit-tested.

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Generic CSV from headers + rows (rows align to headers; cells escaped).
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}

// Percentage 0–100 (rounded), guarding divide-by-zero (0/0 → 0).
export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

// Count items grouped by a key.
export function countBy<T>(items: T[], keyFn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
