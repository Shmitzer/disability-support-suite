// auth-password.ts — password credential, set AFTER the first magic-link sign-in.
// LOGIC ONLY (no UI — cd builds the forms). Thin wrappers over the Supabase browser
// client so cookies/session update correctly. Flow:
//   1. User signs in via the email magic link (existing /login).
//   2. On that session, call setAccountPassword() — sets a Supabase password + marks
//      user_metadata.has_password so the login screen can offer password next time.
//   3. Future logins use signInWithPassword(). The email allowlist still applies.

"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AuthResult = { ok: true } | { ok: false; error: string };

// Set (or change) the signed-in user's password. Requires an active session
// (i.e. just after the magic-link sign-in, or while logged in via password).
export async function setAccountPassword(password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters." };
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password,
    data: { has_password: true },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// Sign in with email + password (returning users who've set one).
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// Has this user set a password? (Drives whether the login screen offers password vs
// magic link.) Reads the metadata flag set by setAccountPassword().
export function hasPasswordSet(user: User | null | undefined): boolean {
  return Boolean(user?.user_metadata?.has_password);
}
