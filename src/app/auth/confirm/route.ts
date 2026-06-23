// /auth/confirm — where the magic-link email lands. Establishes the session
// from the link, then redirects into the app.
//
// Handles both shapes Supabase can send, so it works whether or not the email
// template has been customised:
//   • ?code=...                      → PKCE code exchange (default template)
//   • ?token_hash=...&type=magiclink → OTP verification (token-hash template,
//                                       also works across devices)

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only allow relative redirects (no open-redirect to other origins).
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }

  redirect("/auth/auth-code-error");
}
