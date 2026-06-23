// updateSession — the session-refresh + route-guard logic run by the proxy
// (src/proxy.ts) on every matched request.
//
// It does two jobs, in this order (the order matters — do NOT run other code
// between creating the client and calling getUser()):
//   1. Refreshes the Supabase auth token and writes the rotated cookies onto
//      the outgoing response, so the session stays alive.
//   2. Server-side guard: if there's no signed-in user and the path isn't
//      public, redirect to /login.
//
// getUser() (not getSession()) is used because it revalidates the token with
// Supabase's auth server — getSession() trusts the cookie and can be spoofed.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. Everything else requires login.
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Must return supabaseResponse so the refreshed auth cookies reach the browser.
  return supabaseResponse;
}
