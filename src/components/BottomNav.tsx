// BottomNav.tsx — the app's primary navigation.
// A fixed bar across the bottom of the screen with thumb-reachable tabs,
// the standard pattern for a phone app used one-handed (Option A, mobile-first).
//
// It runs in the browser ("use client") because it uses usePathname() to know
// which page you're on, so it can highlight the active tab.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  // Inline SVG icon. `active` lets the icon match the tab's colour.
  icon: (active: boolean) => React.ReactNode;
  // A tab is active for its exact href, plus any deeper page beneath it
  // (e.g. /notes/123 should still light up the Notes tab).
  match: (pathname: string) => boolean;
};

// The home tab leads to a different dashboard per role, but the path is the
// same ("/dashboard"), so one set of tabs works for both workers and rostering
// staff. ("/" is the public marketing landing, outside the app chrome.)
const ITEMS: Item[] = [
  {
    href: "/dashboard",
    label: "Home",
    match: (p) => p === "/dashboard" || p.startsWith("/shift"),
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      </svg>
    ),
  },
  {
    href: "/notes",
    label: "Notes",
    match: (p) => p.startsWith("/notes"),
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4" />
        <path d="M8 12h8M8 16h6" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white shadow-[0_-1px_3px_rgb(16_24_40_/_0.06)]"
      // Lift the bar above the phone's home-indicator / gesture area.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                  active ? "text-brand" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
