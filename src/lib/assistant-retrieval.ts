// assistant-retrieval.ts — pure ranking for the Caira assistant's context store.
// v1 is lightweight keyword-overlap scoring (no extra infra); the interface is the
// swap point for embeddings/pgvector later (see docs/caira-assistant.md). Pure +
// unit-tested; the DB read + access-scoping live in assistant-actions.ts.

export type ContextSnippet = { id: string; content: string; title?: string | null };

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are", "was",
  "were", "do", "does", "did", "i", "you", "it", "my", "me", "we", "they", "what",
  "how", "who", "with", "about", "can", "have", "has", "this", "that",
]);

function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2 && !STOP.has(t));
}

// Relevance of a snippet to a query: count of distinct query terms it contains,
// with a small boost for density. 0 = no overlap.
export function scoreSnippet(query: string, content: string): number {
  const q = new Set(terms(query));
  if (q.size === 0) return 0;
  const c = terms(content);
  if (c.length === 0) return 0;
  const cset = new Set(c);
  let hits = 0;
  for (const t of q) if (cset.has(t)) hits++;
  if (hits === 0) return 0;
  const coverage = hits / q.size; // how much of the question is covered
  const density = hits / Math.sqrt(c.length); // prefer focused snippets
  return coverage * 2 + density;
}

// Top-N snippets for a query (score > 0), highest first.
export function topContext(query: string, items: ContextSnippet[], n = 6): ContextSnippet[] {
  return items
    .map((it) => ({ it, score: scoreSnippet(query, `${it.title ?? ""} ${it.content}`) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((r) => r.it);
}
