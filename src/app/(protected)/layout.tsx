// Layout for every authenticated page. Replaces the old dev role-switch banner
// with the real signed-in identity + a sign-out control, and carries the
// BottomNav (only authenticated pages get the app chrome).

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/lib/auth-actions";
import { roleLabel } from "@/lib/enums";
import { BottomNav } from "@/components/BottomNav";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy already redirects unauthenticated requests to /login; this is a
  // server-side defence in depth (and covers the brief window before a first
  // Worker row exists for a new auth user).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-800">
            {user.name}
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {roleLabel(user.role)}
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Bottom padding leaves room for the fixed BottomNav. */}
      <div className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        {children}
      </div>

      <BottomNav />
    </>
  );
}
