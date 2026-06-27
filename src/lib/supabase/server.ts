// Supabase server client — for Server Components, Server Actions, and Route
// Handlers. Reads/writes the auth session from Next's request cookies.
//
// Next 16: cookies() is async, so this factory is async too. In a Server
// Component the cookie store is read-only and setAll() throws; we swallow that
// because the proxy (src/proxy.ts) is what actually refreshes the session
// cookies on each request. See node_modules/next/dist/docs and @supabase/ssr.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore — the proxy refreshes the session cookies instead.
          }
        },
      },
    },
  );
}
