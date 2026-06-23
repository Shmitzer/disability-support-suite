// auth-actions.ts — server actions for auth lifecycle (Phase E).
// Sign-in is done client-side (magic link, see (public)/login); sign-out lives
// here so it can clear the Supabase session cookies on the server.

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
