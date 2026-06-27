// pii.ts — minimal PII scrubbing for any text sent to an external AI provider
// (Rule 2: "No PII ever sent to any external API — scrub first").
//
// MVP approach:
//   • Known-name dictionary. Each person's full name AND its significant parts are
//     replaced with a stable token (PERSON_1, …) before the request, and the token
//     is restored to the person's FIRST name in the AI's response — so the saved
//     note reads naturally ("Priya did …") while the real name never leaves the app.
//   • Regex redaction of structured identifiers (email, phone, NDIS number) that
//     must never reach the AI and should never appear in a clean note.
//
// Full named-entity recognition (catching names we were NOT told about — e.g. a
// family member mentioned only in free text) is a later hardening pass; see the
// roadmap. This deliberately fails SAFE: if a token is mangled by the model and
// not restored, the placeholder shows in the note rather than a real name leaking.

export type Scrubbed = {
  /** The input with names tokenised and structured identifiers redacted. */
  text: string;
  /** Restore name tokens (→ first name) in the AI's response. */
  restore: (aiOutput: string) => string;
};

export function scrubPII(input: string, names: string[] = []): Scrubbed {
  let text = input;
  const restoreMap = new Map<string, string>(); // token -> first name
  const patterns: { text: string; token: string }[] = [];

  const cleanNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  cleanNames.forEach((fullName, i) => {
    const token = `PERSON_${i + 1}`;
    restoreMap.set(token, fullName.split(/\s+/)[0]);
    // The full name plus each significant part (≥3 chars, to avoid initials and
    // short words), so both "Priya Sharma" and a later "Priya" are caught.
    const variants = [fullName, ...fullName.split(/\s+/).filter((p) => p.length >= 3)];
    for (const v of new Set(variants)) patterns.push({ text: v, token });
  });

  // Replace longest strings first so full names go before their parts.
  patterns.sort((a, b) => b.text.length - a.text.length);
  for (const { text: name, token } of patterns) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi"), token);
  }

  // Structured identifiers — redacted outright (no restore needed). Phone is matched
  // BEFORE the 9-digit NDIS pattern so a phone number isn't half-eaten by it.
  text = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[redacted email]")
    // Phone: +61 / 0-prefixed, tolerating spaces, hyphens and a parenthesised area
    // code (e.g. "(02) 9876 5432", "+61 2 9876 5432", "0412 345 678").
    .replace(/(?:\+?61[\s-]?|\(0\d\)[\s-]?|\b0)\d(?:[\s-]?\d){7,9}\b/g, "[redacted phone]")
    // NDIS participant number: 9 digits, commonly written with spaces/hyphens
    // ("430 123 456"). The old \b\d{9}\b only caught the unseparated form.
    .replace(/\b\d(?:[\s-]?\d){8}\b/g, "[redacted id]");

  // Restore longest tokens first so PERSON_1 doesn't clobber PERSON_10.
  const ordered = [...restoreMap.entries()].sort((a, b) => b[0].length - a[0].length);
  const restore = (aiOutput: string) =>
    ordered.reduce((acc, [token, first]) => acc.split(token).join(first), aiOutput);

  return { text, restore };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
