// proxy.ts — runs on the server before every matched request.
//
// NOTE ON NAMING: in Next.js 16 the `middleware` file convention was renamed to
// `proxy` (function `proxy`, Node.js runtime by default). This file IS the
// "session-checking middleware" — it just uses the current convention. See
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
//
// All it does is delegate to updateSession(), which refreshes the Supabase auth
// token and redirects unauthenticated users to /login.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
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
