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
//
// SCOPING (#7): a picklist is "global seeds + this org's own options". Curated
// seeds (and any globally-promoted option) carry organisationId = null and are
// shared by every tenant; a word an org's workers type that isn't a global seed
// becomes a SUGGESTED row stamped with that org's id, private to them until it's
// promoted. Passing organisationId scopes both the read and the write; omit it
// (or pass null) for a solo worker, who then sees only the global seeds.
//
// The per-org uniqueness + RLS this implies live as a hand-applied migration:
// prisma/sql/learned_options_per_org.sql. Until that's applied the live DB still
// has the old global unique([kind, name]); the create() below degrades gracefully
// (the unique race is caught), so this code is correct under either schema.

import { prisma } from "@/lib/prisma";
import { captureServerEvent } from "@/lib/analytics";

// How many uses promote a suggested option into the picker.
const PROMOTE_AT = 3;
// Only spell-match words this long or longer — short words (tea, milk, milo, rest)
// are too easy to wrongly merge, so they must match exactly or become new.
const FUZZY_MIN_LENGTH = 5;

// Visibility filter: global rows (organisationId null) plus, when given, this org's
// own rows. A null org sees only the globals.
function scopeWhere(organisationId?: string | null) {
  return organisationId
    ? { OR: [{ organisationId: null }, { organisationId }] }
    : { organisationId: null };
}

// The options shown in a picker, in a sensible order (curated seeds first, then
// the most-used promoted ones). Scoped to global seeds + the caller's org.
export async function getApprovedOptions(
  kind: string,
  organisationId?: string | null,
): Promise<string[]> {
  const rows = await prisma.learnedOption.findMany({
    where: { kind, status: "APPROVED", ...scopeWhere(organisationId) },
    orderBy: [{ sortOrder: "asc" }, { useCount: "desc" }, { name: "asc" }],
  });
  // Dedupe by name in case a global seed and an org row share a canonical name
  // (keeps the first — globals sort first via sortOrder).
  return [...new Set(rows.map((r) => r.name))];
}

// Record one use of a typed (custom) option and return the CANONICAL name to store
// on the entry. Spell-matches to an existing global/org option where possible;
// otherwise creates a new suggestion stamped with the caller's org. Auto-promotes
// once used enough.
export async function recordCustomOption(
  kind: string,
  raw: string,
  organisationId?: string | null,
): Promise<string> {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  // Match against the same scope the worker sees: global seeds + their own org.
  const all = await prisma.learnedOption.findMany({
    where: { kind, ...scopeWhere(organisationId) },
  });
  const match = exactMatch(cleaned, all) ?? fuzzyMatch(cleaned, all);

  if (match) {
    const useCount = match.useCount + 1;
    const promoted = match.status !== "APPROVED" && useCount >= PROMOTE_AT;
    const status = promoted ? "APPROVED" : match.status;
    await prisma.learnedOption.update({
      where: { id: match.id },
      data: { useCount, status, lastUsedAt: new Date() },
    });
    if (promoted) reportOptionEvent("learned_option_promoted", kind, match.name, useCount);
    return match.name;
  }

  const canonical = toCanonical(cleaned);
  try {
    const created = await prisma.learnedOption.create({
      // Stamp the org so the suggestion stays private to that tenant. A solo worker
      // (no org) creates a null-org row, matching the legacy behaviour.
      data: {
        kind,
        name: canonical,
        status: "SUGGESTED",
        source: "custom",
        useCount: 1,
        organisationId: organisationId ?? null,
      },
    });
    reportOptionEvent("learned_option_suggested", kind, canonical, 1);
    return created.name;
  } catch {
    // Race: another save created it first. Just return the canonical name.
    return canonical;
  }
}

// De-identified analytics (#7): tell product when the vocabulary grows — a new
// option is suggested, or one auto-promotes — WITHOUT identifying who. We send a
// constant distinctId and only the kind + canonical name + useCount; no
// organisationId, no userId, no participant or worker data ever leaves. This gives
// a platform-wide view of emerging terms (e.g. a drink lots of orgs invent) to
// feed back into the curated global seeds, while staying tenant-blind.
function reportOptionEvent(event: string, kind: string, name: string, useCount: number): void {
  // Fire-and-forget: analytics must never block or fail a worker's save, and no-ops
  // entirely when PostHog isn't configured.
  void captureServerEvent("learned-options", event, { kind, name, useCount });
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
