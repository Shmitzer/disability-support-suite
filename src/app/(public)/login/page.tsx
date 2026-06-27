// Login page — passwordless magic-link sign-in (Phase E, step 1).
// The user enters their email; Supabase emails a one-click link that lands on
// /auth/confirm, which establishes the session and redirects into the app.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After the user clicks the email link, Supabase returns them here.
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Sign in
        </h1>
        <p className="text-sm text-zinc-500">
          We&apos;ll email you a secure link — no password needed.
        </p>
      </header>

      {status === "sent" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm text-emerald-800">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-emerald-700">
            We sent a sign-in link to <strong>{email}</strong>. Open it on this
            device to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-500"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}

      <footer className="text-center text-xs text-zinc-400">
        Development build · sample data only
      </footer>
    </main>
  );
}
