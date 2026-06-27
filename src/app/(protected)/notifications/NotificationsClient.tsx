"use client";

// Notification center — client feed + push-permission soft-ask.
// Matches docs/design/Caira Notifications.dc.html (phone). The phone surface is a
// fixed-height (844px) internal-scroll container so the priming sheet pins to the
// visible bottom. Feed groups New (unread, teal dot) vs Earlier (read, dimmed);
// tapping a New row marks it read (server action) and moves it to Earlier,
// decrementing the clay unread badge. "Mark all read" clears.
//
// Push priming is a two-step soft-ask: an inline primer card opens a bottom sheet
// that explains *why* before the OS prompt. Web-push is deferred, so "Turn on" is a
// no-op mock that just flips to the "Notifications are on" strip (we never call the
// real Notification API destructively).

import { useState, useTransition, type ReactNode } from "react";
import { markRead, markAllRead } from "@/lib/notifications";

export type FeedItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  unread: boolean;
  createdAt: string; // ISO
};

// --- Per-type tint + line icon -----------------------------------------------
// Kinds: message (teal/brand), medication (meds-pink), reminder/outing (amber),
// incident (clay), shift (sage/status), on-call (clay). Unknown types fall back
// to message styling so the feed degrades gracefully.

type Kind = "message" | "medication" | "reminder" | "incident" | "shift" | "oncall";

function normaliseKind(type: string): Kind {
  const t = type.toLowerCase();
  if (t.includes("med")) return "medication";
  if (t.includes("remind") || t.includes("outing")) return "reminder";
  if (t.includes("incident") || t.includes("report")) return "incident";
  if (t.includes("oncall") || t.includes("on-call") || t.includes("on_call")) return "oncall";
  if (t.includes("shift") || t.includes("handover")) return "shift";
  if (t.includes("message") || t.includes("msg")) return "message";
  return "message";
}

// bg/fg as inline styles so the meds-pink (not in globals) is available here.
const TINT: Record<Kind, { bg: string; fg: string }> = {
  message: { bg: "var(--brand-tint)", fg: "var(--brand-strong)" },
  medication: { bg: "#f3c2d8", fg: "#962f63" },
  reminder: { bg: "var(--amber-bg)", fg: "#a9781f" },
  incident: { bg: "var(--clay-tint)", fg: "var(--clay-strong)" },
  shift: { bg: "var(--status-bg)", fg: "var(--status)" },
  oncall: { bg: "var(--clay-tint)", fg: "var(--clay-strong)" },
};

function KindIcon({ kind, stroke }: { kind: Kind; stroke: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "medication":
      return (
        <svg {...common}>
          <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "reminder":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "incident":
      return (
        <svg {...common}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "shift":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "oncall":
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "message":
    default:
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

// Relative time like the design ("5m", "1h", "Yesterday").
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 0) return "now";
  const m = Math.round(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

const BELL = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-strong)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

type Permission = "default" | "granted";

export default function NotificationsClient({
  items: initialItems,
  unreadCount: initialUnread,
}: {
  items: FeedItem[];
  unreadCount: number;
}) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [permission, setPermission] = useState<Permission>("default");
  const [primerOpen, setPrimerOpen] = useState(false);
  const [primerDismissed, setPrimerDismissed] = useState(false);
  const [, startTransition] = useTransition();

  const newItems = items.filter((n) => n.unread);
  const earlierItems = items.filter((n) => !n.unread);
  const unread = newItems.length;
  void initialUnread; // server count; local list is the live source after mutations.

  function onTapRow(id: string) {
    const item = items.find((n) => n.id === id);
    if (!item || !item.unread) return;
    // Optimistic: move to Earlier immediately, then persist.
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    startTransition(() => {
      void markRead(id);
    });
  }

  function onMarkAll() {
    if (unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    startTransition(() => {
      void markAllRead();
    });
  }

  // Mock OS prompt: web-push is deferred, so we never call the real Notification
  // API. "Turn on" just records in-app intent and shows the confirmation strip.
  function allow() {
    setPermission("granted");
    setPrimerOpen(false);
  }
  function dismissPrimer() {
    setPrimerOpen(false);
    setPrimerDismissed(true);
  }

  const showPrimerCard = permission === "default" && !primerDismissed && !primerOpen;
  const granted = permission === "granted";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        padding: "32px 20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Fixed-height phone surface with internal scroll so the sheet pins to the bottom. */}
      <div
        data-screen-label="Notification center"
        style={{
          width: 412,
          maxWidth: "100%",
          height: 844,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        className="rounded-[30px] border border-border bg-surface shadow-soft"
      >
        {/* ===== HEADER ===== */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-5 py-[18px]">
          <span className="inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
            {BELL}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <span className="font-display text-[21px] font-extrabold tracking-tight text-foreground">
              Notifications
            </span>
            {unread > 0 && (
              <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-clay px-[7px] text-[12px] font-bold text-white">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="cursor-pointer border-none bg-none px-1 py-1.5 text-[14px] font-semibold text-brand"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* ===== SCROLL BODY ===== */}
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-5 pb-6 pt-4">
          {/* Permission primer (inline) */}
          {showPrimerCard && (
            <div
              className="flex flex-col gap-[14px] rounded-[18px] border p-[18px]"
              style={{ background: "var(--brand-tint)", borderColor: "var(--brand-tint)" }}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-surface">
                  {BELL}
                </span>
                <div className="flex flex-1 flex-col gap-[3px]">
                  <span className="text-[16px] font-bold text-brand-strong">
                    Turn on notifications
                  </span>
                  <span className="text-[14px] leading-[1.45] text-brand-strong opacity-90">
                    So meds, reminders and messages reach you while you&rsquo;re focused on your shift.
                  </span>
                </div>
              </div>
              <div className="flex gap-[10px]">
                <button
                  type="button"
                  onClick={() => setPrimerOpen(true)}
                  className="min-h-[44px] flex-1 cursor-pointer rounded-[13px] border-none bg-brand text-[15px] font-bold text-white transition-colors hover:bg-brand-strong"
                >
                  Turn on
                </button>
                <button
                  type="button"
                  onClick={dismissPrimer}
                  className="min-h-[44px] cursor-pointer rounded-[13px] border-none bg-transparent px-4 text-[15px] font-semibold text-brand-strong"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Permission granted strip */}
          {granted && (
            <div className="flex items-center gap-[10px] rounded-[14px] bg-status-bg px-4 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-[14px] font-semibold text-status">
                Notifications are on &middot; you&rsquo;re all set
              </span>
            </div>
          )}

          {/* ===== NEW ===== */}
          {newItems.length > 0 && (
            <Section label="New">
              {newItems.map((n) => (
                <FeedRow key={n.id} item={n} onTap={onTapRow} />
              ))}
            </Section>
          )}

          {/* ===== EARLIER ===== */}
          {earlierItems.length > 0 && (
            <Section label="Earlier">
              {earlierItems.map((n) => (
                <FeedRow key={n.id} item={n} onTap={onTapRow} />
              ))}
            </Section>
          )}

          {/* Graceful empty state */}
          {items.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-surface-sunk text-muted">
                {BELL}
              </span>
              <span className="text-[15px] font-semibold text-foreground">You&rsquo;re all caught up</span>
              <span className="text-[14px] text-muted">No notifications right now.</span>
            </div>
          )}
        </div>

        {/* ===== PRIMING SHEET (overlay) ===== */}
        {primerOpen && (
          <>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPrimerOpen(false)}
              className="absolute inset-0 z-10 cursor-default border-none"
              style={{ background: "rgb(43 42 38 / 0.34)", animation: "rpFade .18s ease" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[18px] bg-surface px-[22px] pb-[26px] pt-6"
              style={{
                borderRadius: "26px 26px 30px 30px",
                boxShadow: "0 -10px 34px rgb(30 34 42 / 0.14)",
                animation: "rpSheetUp .26s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <span className="h-1 w-10 self-center rounded-full bg-border" />
              <div className="flex flex-col items-center gap-[10px] text-center">
                <span className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand-tint">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand-strong)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                <span className="font-display text-[23px] font-extrabold tracking-tight text-foreground">
                  Stay on top of the shift
                </span>
                <span className="text-[15px] leading-[1.5] text-muted">
                  Caira only sends what matters during a shift &mdash; never marketing. You can change
                  this any time in Settings.
                </span>
              </div>
              <div className="flex flex-col gap-[14px] px-1 pt-1">
                {PRIMER_BENEFITS.map((b) => (
                  <div key={b.title} className="flex items-start gap-3">
                    <span
                      className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: TINT[b.kind].bg }}
                    >
                      <KindIcon kind={b.kind} stroke={TINT[b.kind].fg} />
                    </span>
                    <div className="flex flex-1 flex-col gap-[2px]">
                      <span className="text-[15px] font-semibold text-foreground">{b.title}</span>
                      <span className="text-[13px] leading-[1.4] text-muted">{b.body}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={allow}
                  className="min-h-[56px] cursor-pointer rounded-[var(--radius)] border-none bg-brand text-[16px] font-bold text-white transition-colors hover:bg-brand-strong"
                >
                  Turn on notifications
                </button>
                <button
                  type="button"
                  onClick={dismissPrimer}
                  className="min-h-[48px] cursor-pointer border-none bg-transparent text-[15px] font-semibold text-muted"
                >
                  Not now
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Local keyframes for the sheet (scoped; globals untouched). */}
      <style jsx>{`
        @keyframes rpSheetUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes rpFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="animation"],
          button[style*="animation"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </div>
  );
}

function FeedRow({ item, onTap }: { item: FeedItem; onTap: (id: string) => void }) {
  const kind = normaliseKind(item.type);
  const tint = TINT[kind];
  const time = relTime(item.createdAt);

  if (item.unread) {
    return (
      <button
        type="button"
        onClick={() => onTap(item.id)}
        className="flex w-full items-start gap-[13px] rounded-2xl border border-border bg-surface-2 p-[14px] text-left transition-colors hover:bg-surface-sunk"
      >
        <span
          className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: tint.bg }}
        >
          <KindIcon kind={kind} stroke={tint.fg} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-[1.3] text-foreground">
              {item.title}
            </span>
            <span className="flex-shrink-0 text-[12px] text-muted">{time}</span>
          </span>
          <span className="block text-[14px] leading-[1.4] text-foreground">{item.body}</span>
        </span>
        <span className="mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full bg-brand" />
      </button>
    );
  }

  // Earlier (read) — dimmed, non-interactive.
  return (
    <div className="flex w-full items-start gap-[13px] rounded-2xl border border-transparent p-[14px] text-left opacity-[0.72]">
      <span
        className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: tint.bg }}
      >
        <KindIcon kind={kind} stroke={tint.fg} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.3] text-foreground">
            {item.title}
          </span>
          <span className="flex-shrink-0 text-[12px] text-muted">{time}</span>
        </span>
        <span className="block text-[14px] leading-[1.4] text-muted">{item.body}</span>
      </span>
    </div>
  );
}

const PRIMER_BENEFITS: { kind: Kind; title: string; body: string }[] = [
  {
    kind: "medication",
    title: "Meds & reminders, on time",
    body: "A nudge before each dose or outing — nothing slips.",
  },
  {
    kind: "message",
    title: "Messages & on-call",
    body: "Hear from your coordinator the moment it matters.",
  },
  {
    kind: "incident",
    title: "Reporting deadlines",
    body: "Reminders before a reportable incident is due.",
  },
];
