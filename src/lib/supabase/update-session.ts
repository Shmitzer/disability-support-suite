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
import { DEV_AUTH } from "@/lib/dev-auth";

// Paths reachable without a session. Everything else requires login.
// "/" is the public marketing landing and /privacy is the public policy page;
// /api/health is the public uptime probe; /api/stripe is the signature-verified
// webhook (both Phase F) — none of these have a user session.
const PUBLIC_PREFIXES = ["/login", "/privacy", "/auth", "/api/health", "/api/stripe"];

function isPublicPath(pathname: string): boolean {
  // Exact root only (so "/" is public but it isn't a prefix for everything).
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function updateSession(request: NextRequest) {
  // DEV_AUTH (local/sandbox): there is no Supabase session to refresh and no
  // /login to gate on — the dev role-switch drives identity. Skip the auth gate
  // entirely so requests aren't bounced to /login. Never active in production.
  if (DEV_AUTH) return NextResponse.next({ request });

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
