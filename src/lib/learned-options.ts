// learned-options.ts — the reusable "self-learning picklist" layer.
//
// Picklists like drinks and activities show APPROVED options. When a worker types
// one that isn't there, we don't blindly add it: first we SPELL-MATCH it to a
// known option (so "cofee" counts as Coffee, "swiming" as Swimming). If it's
// genuinely new we record it as SUGGESTED and count its uses; once it's been used
// a few times it auto-promotes to APPROVED and shows up in everyone's picker.
//
// `kind` namespaces each list ("drink", "activity", …). Server-only (touches the
// database). An admin screen to review/adjust comes later — the table already has
// status / useCount / source.

import { prisma } from "@/lib/prisma";

// How many uses promote a suggested option into the picker.
const PROMOTE_AT = 3;
// Only spell-match words this long or longer — short words (tea, milk, milo, rest)
// are too easy to wrongly merge, so they must match exactly or become new.
const FUZZY_MIN_LENGTH = 5;

// The options shown in a picker, in a sensible order (curated seeds first, then
// the most-used promoted ones).
export async function getApprovedOptions(kind: string): Promise<string[]> {
  const rows = await prisma.learnedOption.findMany({
    where: { kind, status: "APPROVED" },
    orderBy: [{ sortOrder: "asc" }, { useCount: "desc" }, { name: "asc" }],
  });
  return rows.map((r) => r.name);
}

// Record one use of a typed (custom) option and return the CANONICAL name to store
// on the entry. Spell-matches to an existing option where possible; otherwise
// creates a new suggestion. Auto-promotes once used enough.
export async function recordCustomOption(kind: string, raw: string): Promise<string> {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const all = await prisma.learnedOption.findMany({ where: { kind } });
  const match = exactMatch(cleaned, all) ?? fuzzyMatch(cleaned, all);

  if (match) {
    const useCount = match.useCount + 1;
    const status = match.status !== "APPROVED" && useCount >= PROMOTE_AT ? "APPROVED" : match.status;
    await prisma.learnedOption.update({
      where: { id: match.id },
      data: { useCount, status, lastUsedAt: new Date() },
    });
    return match.name;
  }

  const canonical = toCanonical(cleaned);
  try {
    const created = await prisma.learnedOption.create({
      data: { kind, name: canonical, status: "SUGGESTED", source: "custom", useCount: 1 },
    });
    return created.name;
  } catch {
    // Race: another save created it first. Just return the canonical name.
    return canonical;
  }
}

// --- matching helpers ------------------------------------------------------

type Option = { id: string; name: string; status: string; useCount: number };

function exactMatch(name: string, all: Option[]): Option | null {
  const n = norm(name);
  return all.find((d) => norm(d.name) === n) ?? null;
}

// Closest known option within a small edit distance — catches typos in longer
// names ("swiming" → "Swimming") while leaving short words alone.
function fuzzyMatch(name: string, all: Option[]): Option | null {
  const n = norm(name);
  if (n.length < FUZZY_MIN_LENGTH) return null;
  const allowed = n.length <= 7 ? 1 : 2;

  let best: Option | null = null;
  let bestDist = Infinity;
  for (const d of all) {
    const dist = editDistance(n, norm(d.name));
    if (dist <= allowed && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Canonical display = sentence case, matching the seeded style ("Soft drink").
function toCanonical(s: string): string {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Levenshtein edit distance — the number of single-character edits to turn one
// string into another. Small = likely a typo.
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
