// middleware.ts — runs on the server before every matched request. This is the
// app's auth gate: it refreshes the Supabase session and redirects signed-out
// users to /login.
//
// NOTE: Next.js 16 renamed this file convention from `middleware` to `proxy`.
// Both names still work in this version; we keep `middleware.ts`. To switch to
// the newer name, rename to `src/proxy.ts` and the export to `proxy`
// (or run: npx @next/codemod middleware-to-proxy .).
//
// All it does is delegate to updateSession(), which refreshes the Supabase auth
// token and redirects unauthenticated users to /login.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and image files, so auth checks
     * never block CSS/JS/images. (Auth API + RSC data routes are still covered.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
