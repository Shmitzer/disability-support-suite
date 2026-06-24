// WaitlistForm.tsx — the email-capture form on the public landing page.
// Client component: it uses useActionState to call the joinWaitlist server action
// and swap in a success message (or show an inline error) without a full reload.

"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/lib/waitlist-actions";

const INITIAL: WaitlistState = { ok: false, message: "" };

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);

  if (state.ok) {
    return (
      <p className="w-full max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join the waitlist"}
        </button>
      </form>
      {state.message && (
        <p className="text-sm text-rose-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
