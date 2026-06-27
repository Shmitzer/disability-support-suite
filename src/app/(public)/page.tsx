// Public marketing landing page (route "/"). The authenticated app lives under
// /dashboard; this page is reachable without a session (see PUBLIC_PREFIXES in
// update-session.ts).
//
// Design SSOT: docs/design/Caira Sales Site.dc.html — Direction B ("teal"). Sage & Clay
// tokens come from src/app/globals.css (var(--brand) teal, var(--clay), var(--surface)…).

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DEV_AUTH } from "@/lib/dev-auth";
import { APP_NAME } from "@/lib/brand";
import { WaitlistForm } from "@/components/WaitlistForm";

const stats = [
  { big: "3 taps", small: "from clock-on to a clean record" },
  { big: "6 months", small: "of competitive intro rates to start" },
  { big: "20% less", small: "than your current tool, after that" },
];

const steps = [
  { n: "1", title: "Clock on", body: "One tap puts you on shift — Caira holds the time, the place and who you’re with." },
  { n: "2", title: "Tap to log", body: "Six calm tiles cover the whole shift. Big targets, one-handed, no menus to hunt through." },
  { n: "3", title: "Hand over clean", body: "Finish with a clear, person-first record. No retyping notes at the end of the day." },
];

const cats = [
  { label: "Food", note: "Meals & snacks" },
  { label: "Drink", note: "Fluids & hydration" },
  { label: "Meds", note: "Doses & PRN" },
  { label: "Hygiene", note: "Washing & grooming" },
  { label: "Activity", note: "Outings & movement" },
  { label: "Toilet", note: "Toileting & continence" },
];

const promos = [
  { tag: "Founding rate", title: "6 months at our best price", detail: "Lock in competitive intro pricing while you switch across from your current tool." },
  { tag: "Price promise", title: "Then 20% under your tool", detail: "After your intro period, we beat what you pay today — guaranteed, in writing." },
  { tag: "No risk", title: "Free trial, no card", detail: "Try the full Shift Tracker free. No lock-in, cancel any time you like." },
];

export default async function LandingPage() {
  // Signed-in users skip the marketing page and go straight to the app. Skipped
  // under DEV_AUTH, where a dev identity is always "signed in".
  if (!DEV_AUTH) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col" style={{ background: "var(--surface)", color: "var(--foreground)" }}>
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-6 pt-20 pb-12 sm:pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--brand)" }}>
          Behind every log is a person
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
          Care is the work.
          <br />
          <span style={{ color: "var(--brand)" }}>{APP_NAME} handles the record.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: "var(--muted)" }}>
          A shift-logger that feels like a calm colleague — warm, quick and person-first. Capture the
          day with dignity, then hand over a record you’re proud of.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href="#waitlist"
            className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--brand)" }}
          >
            Start free trial
          </Link>
          <Link
            href="#how"
            className="rounded-full px-6 py-3 text-sm font-semibold transition-colors"
            style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-16 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.big} className="rounded-2xl px-6 py-5" style={{ background: "var(--surface-sunk)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}>{s.big}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{s.small}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="border-t" style={{ borderColor: "var(--surface-sunk)" }}>
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            A whole shift, gently captured.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Log categories */}
      <section className="border-t" style={{ borderColor: "var(--surface-sunk)" }}>
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>Log categories</p>
          <p className="mt-3 max-w-xl text-base" style={{ color: "var(--muted)" }}>
            Six calm categories cover the whole day. Big targets, one-handed, no menus to hunt.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cats.map((c) => (
              <div key={c.label} className="rounded-2xl px-5 py-4" style={{ background: "var(--surface-sunk)" }}>
                <div className="text-base font-semibold">{c.label}</div>
                <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing promise */}
      <section className="border-t" style={{ borderColor: "var(--surface-sunk)" }}>
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-3">
          {promos.map((p) => (
            <div key={p.tag} className="flex flex-col gap-2 rounded-2xl p-6" style={{ border: "1px solid var(--surface-sunk)" }}>
              <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--clay)" }}>{p.tag}</span>
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist / sign in */}
      <section id="waitlist" className="border-t" style={{ borderColor: "var(--surface-sunk)", background: "var(--surface-sunk)" }}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Join the waitlist for early access
          </h2>
          <WaitlistForm />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--brand)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--surface-sunk)" }}>
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs sm:flex-row" style={{ color: "var(--muted)" }}>
          <span>Development build · sample data only</span>
          <Link href="/privacy" className="hover:underline" style={{ color: "var(--brand)" }}>
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  );
}
