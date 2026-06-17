// session-actions.ts — server action for the dev role-switch.
// Runs on the server; setting the cookie auto-refreshes the page so the new
// "logged in" worker takes effect everywhere immediately.

"use server";

import { cookies } from "next/headers";
import { WORKER_COOKIE } from "@/lib/session";

export async function setCurrentWorker(formData: FormData) {
  const workerId = String(formData.get("workerId") ?? "");
  if (!workerId) return;

  const store = await cookies();
  store.set(WORKER_COOKIE, workerId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
