// /auth/denied — shown when a signed-in user's email isn't on the access allowlist
// (soft-release lock-down; see src/lib/allowlist.ts). Public route so it renders
// without bouncing. Offers a sign-out so they can leave the half-session cleanly.

import { signOut } from "@/lib/auth-actions";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME} — Access pending` };

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        You&rsquo;re not on the list yet
      </h1>
      <p className="text-sm text-muted">
        {APP_NAME} is in a private early release. Your sign-in worked, but this email
        hasn&rsquo;t been granted access. If you think that&rsquo;s a mistake, ask the
        person who invited you to add your email, then sign in again.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="h-11 w-full rounded-2xl bg-brand px-6 text-base font-bold text-white transition-colors hover:bg-brand-strong"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
