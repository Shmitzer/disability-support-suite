// waitlist.ts — pure helpers for the pre-launch waitlist. No DB/IO, so this is safe
// to unit-test and to import from either client or server. The server action that
// actually stores a signup lives in waitlist-actions.ts (the same split as
// billing.ts / billing-actions.ts).

// Permissive but sane email check — rejects empties and obvious typos without
// rejecting valid-but-unusual addresses. The DB unique constraint is the backstop.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Normalise before storing/looking up so "  Foo@Bar.com " and "foo@bar.com" count
// as the same signup.
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}
