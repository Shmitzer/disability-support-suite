// note-extraction.ts — turn a free-text shift note into structured, categorised log
// entries that map EXACTLY onto the existing capture chips (LOG_CATEGORIES).
//
// This module is PURE (no DB, no network): the LLM call lives in src/lib/ai.ts
// (Rule 1), and the DB writes live in src/lib/log-actions.ts. Here we (a) describe
// the chip catalogue for the prompt so it can never drift from the real categories,
// and (b) validate + map the model's JSON into the exact shape LogEntry needs —
// category, the "Water · 250 mL" detail string, an absolute timestamp, and notes.
//
// Keeping mapping pure means the category/group/amount rules and the relative-time
// resolution are deterministic and unit-tested, independent of the model.

import { LOG_CATEGORIES, findCategory } from "@/lib/log-categories";

// One item as the model is asked to return it (see EXTRACT_SYSTEM_PROMPT in ai.ts).
export type ExtractedItem = {
  category: string; // must be a LOG_CATEGORIES key (e.g. "Toileting")
  time: string; // absolute "HH:MM" (24h), already resolved from relative refs
  note?: string; // short factual observation (the worker's words)
  groups?: Record<string, string[]>; // group key → chosen option(s), e.g. { drink: ["Coffee"] }
  amountMl?: number; // for categories with an amount (Fluids)
};

// The shape we hand to the DB layer (mirrors LogEntry's writable fields).
export type MappedEntry = {
  category: string;
  detail: string | null; // assembled "A · B · 250 mL" string, or null
  notes: string;
  timestamp: Date;
};

// Categories the extractor may target. "Note" is the SOURCE (the narrative), not a
// target, so it's excluded; everything else — including Incident — is fair game.
export const EXTRACTION_TARGETS = LOG_CATEGORIES.filter((c) => c.key !== "Note");

// A compact catalogue string injected into the system prompt, generated FROM the
// real categories so the prompt and the app never disagree on what's valid.
export function extractionCatalogue(): string {
  return EXTRACTION_TARGETS.map((c) => {
    const groups = (c.groups ?? []).map(
      (g) => `${g.key} [${g.mode}]: ${g.options.join(", ")}${g.allowOther ? ", or free text" : ""}`,
    );
    if (c.amount) groups.push(`amount: number in ${c.amount.unit}`);
    const detail = groups.length ? ` — ${groups.join(" | ")}` : "";
    return `- ${c.key} (${c.label})${detail}`;
  }).join("\n");
}

// Resolve an "HH:MM" string onto the note's date. Falls back to `base` if the time
// is missing or malformed (so a bad value never produces an Invalid Date).
export function parseTimeOnDate(time: string | undefined, base: Date): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time ?? "").trim());
  if (!m) return new Date(base);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return new Date(base);
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d;
}

// Build the entry's `detail` string from extracted groups + amount, applying the
// SAME rules as the live capture path (valid options only, single vs multi,
// showWhen dependencies, amount unit). Unknown options are dropped; for groups that
// allow free text ("other"), an unrecognised value is kept verbatim.
export function buildDetailFromGroups(
  categoryKey: string,
  groups: Record<string, string[]> | undefined,
  amountMl?: number,
): string | null {
  const cat = findCategory(categoryKey);
  if (!cat?.groups) {
    // Categories without groups (e.g. Incident) carry no structured detail.
    if (cat?.amount && isPositive(amountMl)) return `${amountMl} ${cat.amount.unit}`;
    return null;
  }

  const parts: string[] = [];
  const chosen: Record<string, string[]> = {};
  for (const g of cat.groups) {
    // Honour showWhen: only include a dependent group if its trigger qualifies.
    if (g.showWhen) {
      const dep = chosen[g.showWhen.group] ?? [];
      if (!dep.some((v) => g.showWhen!.in.includes(v))) continue;
    }
    const raw = (groups?.[g.key] ?? []).map((v) => String(v).trim()).filter(Boolean);
    let vals = raw.filter((v) => g.options.includes(v));
    // Allow free-text values for groups that permit "other" (e.g. a learned drink).
    if (g.allowOther) {
      for (const v of raw) if (!g.options.includes(v) && !vals.includes(v)) vals.push(v);
    }
    if (g.mode === "single") vals = vals.slice(0, 1);
    chosen[g.key] = vals;
    parts.push(...vals);
  }
  if (cat.amount && isPositive(amountMl)) parts.push(`${amountMl} ${cat.amount.unit}`);

  return parts.length ? parts.join(" · ") : null;
}

// Validate + map raw extracted items into entries ready for the DB. Drops items
// whose category isn't a real chip, coerces details, and resolves each time onto
// `baseDate` (the note's date). Returns them in chronological order.
export function mapExtractedToEntries(items: ExtractedItem[], baseDate: Date): MappedEntry[] {
  const mapped: MappedEntry[] = [];
  for (const it of Array.isArray(items) ? items : []) {
    const cat = findCategory(it?.category ?? "");
    // Only real, targetable categories. Unknown / "Note" are skipped (the original
    // narrative is kept separately as the parent note).
    if (!cat || cat.key === "Note") continue;
    mapped.push({
      category: cat.key,
      detail: buildDetailFromGroups(cat.key, it.groups, it.amountMl),
      notes: typeof it.note === "string" ? it.note.trim() : "",
      timestamp: parseTimeOnDate(it.time, baseDate),
    });
  }
  return mapped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function isPositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
