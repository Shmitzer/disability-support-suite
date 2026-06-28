// waitlist-actions.ts — capture a pre-launch signup from the public landing page.
// Public (no auth): anyone can join. The write goes through Prisma, which connects
// with the privileged role and so bypasses RLS; the table itself is denied to the
// public Data API (enable-RLS-no-policy in rls_policies.sql) because it holds raw
// email addresses.

"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isValidEmail, normaliseEmail } from "@/lib/waitlist";
import { checkRateLimit } from "@/lib/rate-limit";

// Shape returned to useActionState on the form.
export type WaitlistState = { ok: boolean; message: string };

const SUCCESS = "You’re on the list — we’ll be in touch.";

// Best-effort client IP from the proxy headers (Vercel sets x-forwarded-for).
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = normaliseEmail(String(formData.get("email") ?? ""));

  if (!isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  // This action is public (unauthenticated) — throttle per IP so it can't be used
  // to flood the table with signups (no-op until Upstash is configured).
  const rl = await checkRateLimit(`waitlist:${await clientIp()}`);
  if (!rl.allowed) {
    return { ok: false, message: "Too many attempts — please try again shortly." };
  }

  try {
    await prisma.waitlistSignup.create({ data: { email, source: "landing" } });
  } catch (err) {
    // Already signed up? A unique-constraint clash (P2002) is success from the
    // visitor's point of view — and not revealing "you're already on the list"
    // avoids leaking which emails are stored.
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
      return { ok: true, message: SUCCESS };
    }
    console.error("waitlist signup failed:", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return { ok: true, message: SUCCESS };
}
