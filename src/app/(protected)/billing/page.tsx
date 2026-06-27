// /billing — organisation subscription management (Phase F). Wired to the Stripe
// checkout/portal server actions. Org-level billing is admin-managed, so the
// controls show only for rostering/admin staff; everyone else gets a short notice.
// Degrades gracefully: a notice (not a broken button) when Stripe isn't configured
// or the account has no organisation.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isRosteringRole } from "@/lib/enums";
import { stripeConfigured } from "@/lib/stripe";
import { startCheckout, openBillingPortal } from "@/lib/billing-actions";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const worker = await getCurrentUser();
  if (!worker) redirect("/login");

  const { status } = await searchParams; // Stripe checkout return: success | cancelled

  const isAdmin = isRosteringRole(worker.role);
  const org = worker.organisationId
    ? await prisma.organisation.findUnique({ where: { id: worker.organisationId } })
    : null;
  const subscribed = org?.subscriptionStatus === "active";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Billing</h1>
        <p className="text-zinc-600">Manage your organisation&rsquo;s subscription.</p>
      </header>

      {status === "success" && (
        <Banner tone="success">
          Subscription updated — thank you. It can take a moment to appear below.
        </Banner>
      )}
      {status === "cancelled" && (
        <Banner tone="muted">Checkout cancelled — no charge was made.</Banner>
      )}

      <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {!isAdmin ? (
          <p className="text-zinc-600">
            Billing is managed by your organisation&rsquo;s admin.
          </p>
        ) : !org ? (
          <p className="text-zinc-600">
            Your account isn&rsquo;t linked to an organisation yet, so there&rsquo;s nothing to bill.
          </p>
        ) : !stripeConfigured() ? (
          <p className="text-zinc-600">Billing isn&rsquo;t configured for this environment yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Organisation
                </span>
                <span className="truncate text-lg font-semibold text-zinc-900">{org.name}</span>
              </div>
              <StatusBadge status={org.subscriptionStatus} />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-5">
              {!subscribed && (
                <form action={startCheckout}>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                    {org.stripeCustomerId ? "Resume subscription" : "Subscribe"}
                  </button>
                </form>
              )}
              {org.stripeCustomerId && (
                <form action={openBillingPortal}>
                  <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50">
                    Manage billing
                  </button>
                </form>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              Payments are processed securely by Stripe. You can change or cancel your plan
              anytime from &ldquo;Manage billing&rdquo;.
            </p>
          </>
        )}
      </section>

      <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
        Development build · sample data only
      </footer>
    </main>
  );
}

// A small colour-coded badge for the subscription status.
function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    trialing: { label: "Trialing", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    past_due: { label: "Past due", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
    canceled: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  };
  const s = status
    ? (styles[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" })
    : { label: "No subscription", cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

// A full-width return banner shown after a Stripe checkout round-trip.
function Banner({ tone, children }: { tone: "success" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>
  );
}
