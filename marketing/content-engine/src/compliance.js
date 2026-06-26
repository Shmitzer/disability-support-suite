// NDIS advertising compliance check (PLAYBOOK.md §Australia/NDIS compliance).
// ACCC/NDIA/NDIS Commission penalise misleading NDIS advertising — e.g. WeFlex
// ($19,800, June 2026), Vorwerk/Thermomix ($79,200) and Bedshed ($39,600) in 2025.
// This is a guard-rail, not legal advice: it flags risky wording for human review.

export function checkText(text, compliance) {
  const lower = text.toLowerCase();
  const banned = (compliance?.bannedPhrases || []).filter((p) => lower.includes(p));
  const caution = (compliance?.cautionPhrases || []).filter((p) =>
    new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
  );
  return { banned, caution, hardFail: banned.length > 0 };
}

export function checkQueue(queue, compliance) {
  return queue.map((d) => ({ id: d.id, ...checkText(d.text || "", compliance) }));
}
