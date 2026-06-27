// Public marketing landing page (route "/"). The authenticated app lives under
// /dashboard; this page is reachable without a session (see PUBLIC_PREFIXES in
// update-session.ts).
//
// PLACEHOLDER COPY: structure and routing are real; the words/branding are a first
// draft for you to refine. Terminology uses sectorLabels() (Rule 4) so it re-skins
// per sector instead of hardcoding "participant".

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DEV_AUTH } from "@/lib/dev-auth";
import { sectorLabels } from "@/lib/sector-config";
import { APP_NAME } from "@/lib/brand";
import { WaitlistForm } from "@/components/WaitlistForm";

export default async function LandingPage() {
  // Signed-in users skip the marketing page and go straight to the app. Skipped
  // under DEV_AUTH, where a dev identity is always "signed in", so the sandbox can
  // still preview this page.
  if (!DEV_AUTH) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  }

  const labels = sectorLabels();

  const features = [
    {
      title: "Shifts & clock-on",
      body: "See your next shift, accept offered work, and clock on and off in a tap — built for one-handed use on the go.",
    },
    {
      title: "AI-assisted notes",
      body: `Turn rough jottings into clean ${labels.noteStyle} progress notes in seconds, with your ${labels.participantPlural}’ details kept private.`,
    },
    {
      title: "Mileage & timesheets",
      body: "Travel and hours are captured as you work, so your timesheet is ready when you are.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-20">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-medium text-brand">{APP_NAME} · {labels.tagline}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Support work, minus the paperwork.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            {APP_NAME} keeps shifts, notes and mileage in one place, so you can spend
            less time on admin and more time on support.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-700">
            Join the waitlist for early access:
          </p>
          <WaitlistForm />
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 bg-zinc-50/60">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 px-6 py-14 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-zinc-900">{f.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-400 sm:flex-row">
          <span>Development build · sample data only</span>
          <Link href="/privacy" className="text-zinc-500 hover:underline">
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  );
}
