// session-actions.ts — server action for the dev role-switch (DEV_AUTH only).
// Runs on the server; setting the cookie auto-refreshes the page so the new
// "logged in" worker takes effect everywhere immediately. Inert in production:
// the cookie is only ever read when DEV_AUTH is on (see session.ts).

"use server";

import { cookies } from "next/headers";
import { WORKER_COOKIE } from "@/lib/session";
import { DEV_AUTH } from "@/lib/dev-auth";

export async function setCurrentWorker(formData: FormData) {
  if (!DEV_AUTH) return; // dev role-switch only — never in production

  const workerId = String(formData.get("workerId") ?? "");
  if (!workerId) return;

  const store = await cookies();
  store.set(WORKER_COOKIE, workerId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
