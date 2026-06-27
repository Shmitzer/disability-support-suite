// quick-unlock.ts — device "quick unlock" PIN. LOGIC ONLY (cd builds the PIN screen).
//
// IMPORTANT: this is a CONVENIENCE lock over an already-authenticated Supabase session
// on THIS device — NOT a server auth factor. The real credential is the magic link /
// password (auth-password.ts). The PIN just re-gates the app UI quickly when reopening.
// If the Supabase session has expired, the user must fully re-authenticate regardless.
//
// Hardening for a low-entropy PIN: salted SHA-256 (WebCrypto), bound to the account
// (a different user clears it), a failure lockout that wipes the PIN and forces real
// re-auth, and the "unlocked" flag lives in sessionStorage (gone when the tab closes).

const K = {
  hash: "caira_qup_hash",
  salt: "caira_qup_salt",
  user: "caira_qup_user",
  fails: "caira_qup_fails",
  unlocked: "caira_qup_unlocked", // sessionStorage
};
const MAX_FAILS = 5;

function ls(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
function ss(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hash(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}
function randomSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}

// Is a quick-unlock PIN set for this user on this device?
export function hasQuickPin(userId: string): boolean {
  const s = ls();
  return !!s && s.getItem(K.hash) !== null && s.getItem(K.user) === userId;
}

// Set / replace the PIN (call while authenticated). 4–8 digits.
export async function setQuickPin(pin: string, userId: string): Promise<AuthPinResult> {
  const s = ls();
  if (!s) return { ok: false, error: "Storage unavailable." };
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "PIN must be 4–8 digits." };
  const salt = randomSalt();
  s.setItem(K.salt, salt);
  s.setItem(K.hash, await hash(pin, salt));
  s.setItem(K.user, userId);
  s.removeItem(K.fails);
  ss()?.setItem(K.unlocked, "1"); // setting it counts as unlocked now
  return { ok: true };
}

export function clearQuickPin(): void {
  const s = ls();
  if (s) [K.hash, K.salt, K.user, K.fails].forEach((k) => s.removeItem(k));
  ss()?.removeItem(K.unlocked);
}

export type AuthPinResult = { ok: true } | { ok: false; error: string };
export type PinVerifyResult =
  | { ok: true }
  | { ok: false; error: string; remaining: number; cleared?: boolean };

// Verify a PIN attempt for `userId`. Wipes the PIN after MAX_FAILS (→ force re-auth),
// and clears it if the device's stored PIN belongs to a different user.
export async function verifyQuickPin(pin: string, userId: string): Promise<PinVerifyResult> {
  const s = ls();
  if (!s || s.getItem(K.hash) === null) return { ok: false, error: "No PIN set.", remaining: 0 };
  if (s.getItem(K.user) !== userId) {
    clearQuickPin();
    return { ok: false, error: "PIN was set for a different account.", remaining: 0, cleared: true };
  }
  const salt = s.getItem(K.salt) ?? "";
  if ((await hash(pin, salt)) === s.getItem(K.hash)) {
    s.removeItem(K.fails);
    ss()?.setItem(K.unlocked, "1");
    return { ok: true };
  }
  const fails = (parseInt(s.getItem(K.fails) ?? "0", 10) || 0) + 1;
  if (fails >= MAX_FAILS) {
    clearQuickPin();
    return { ok: false, error: "Too many attempts — please sign in again.", remaining: 0, cleared: true };
  }
  s.setItem(K.fails, String(fails));
  return { ok: false, error: "Incorrect PIN.", remaining: MAX_FAILS - fails };
}

// Should cd show the PIN screen now? True when a PIN is set for this user and this
// tab hasn't been unlocked yet. (No PIN, or already unlocked → app shows normally.)
export function isQuickLocked(userId: string): boolean {
  if (!hasQuickPin(userId)) return false;
  return ss()?.getItem(K.unlocked) !== "1";
}

// Re-engage the lock (e.g. a manual "lock now" button) for the current tab.
export function engageQuickLock(): void {
  ss()?.removeItem(K.unlocked);
}
