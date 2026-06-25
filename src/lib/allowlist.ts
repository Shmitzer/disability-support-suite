// allowlist.ts — opt-in email allowlist for a controlled (soft-release) launch.
//
// When AUTH_ALLOWLIST is set, only those emails may use the app — everyone else is
// signed-in-but-denied (bounced to /auth/denied) and never gets a Worker row or data.
// When it's UNSET/empty the allowlist is NOT enforced (open magic-link), so dev and
// existing behaviour are unchanged. Set it in the host's env to lock the release down.
//
// Edge-safe on purpose: reads only process.env + string ops, imports nothing — so the
// proxy/middleware (edge runtime) can import it.
//
// Entry formats (comma / whitespace / newline separated, case-insensitive):
//   - exact:  someone@example.com
//   - whole domain:  @example.com   (allows anyone at that domain)

export function allowlistEntries(): string[] {
  return (process.env.AUTH_ALLOWLIST ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function allowlistActive(): boolean {
  return allowlistEntries().length > 0;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const entries = allowlistEntries();
  if (entries.length === 0) return true; // not enforced
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  const domain = e.slice(e.indexOf("@")); // "@example.com"
  return entries.some((entry) => entry === e || (entry.startsWith("@") && entry === domain));
}
