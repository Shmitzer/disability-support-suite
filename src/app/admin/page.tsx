// /admin — Caira coordinator dashboard (CairaAdmin).
//
// The manager view: oversight of everyone on shift, alerts, on-call, and the
// day's activity at a glance. Rebuilt as a real TSX route from the design source
// of truth (docs/design/Caira Tablet & Web.dc.html → "Web A · Coordinator
// dashboard"), in the Sage & Clay tokens.
//
// This is a PROTOTYPE: every figure below is mock data, not the live DB. It lives
// outside the (protected) phone chrome (no BottomNav/worker header) so it gets the
// full desktop canvas the design calls for — but middleware.ts still auth-gates it,
// so a signed-out visitor is bounced to /login before reaching here.

import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME} — Coordinator dashboard` };

// ---- Mock data (prototype only; no persistence, no backend) ----------------

const STATS = [
  { label: "On shift", value: "12", color: "var(--brand)" },
  { label: "Logs today", value: "148", color: "var(--foreground)" },
  { label: "Open incidents", value: "2", color: "#c2563f" },
  { label: "Meds due", value: "3", color: "#b08433" },
];

type OnShift = {
  initials: string;
  name: string;
  room: string;
  last: string;
  state: "ON" | "DUE";
  tint: string;
  fg: string;
};

const ON_SHIFT: OnShift[] = [
  { initials: "JD", name: "John D.", room: "Maple, Rm 1", last: "Last: Drink · 20:31", state: "ON", tint: "#e9dcc8", fg: "#0f766e" },
  { initials: "AT", name: "Aisha T.", room: "Maple, Rm 2", last: "Last: Meds · 20:00", state: "ON", tint: "#f1e2d6", fg: "#b06a4a" },
  { initials: "RW", name: "Robert W.", room: "Oak, Rm 3", last: "Meds due 21:00", state: "DUE", tint: "#e6e0ee", fg: "#6b5b95" },
  { initials: "PL", name: "Priya L.", room: "Oak, Rm 4", last: "Last: Activity · 19:40", state: "ON", tint: "#dbe7e4", fg: "#0f766e" },
];

const ATTENTION = [
  { dot: "#c2563f", title: "Incident · Oak Rm 3", titleColor: "#b23a28", body: "Fall reported 19:05 — awaiting review", bg: "#f9f1ef", border: "#ecd9d2" },
  { dot: "#b08433", title: "Meds due · Robert W.", titleColor: "#8a6a1f", body: "Evening dose at 21:00", bg: "#fdf6ea", border: "#efe1c6" },
];

const RECENT = [
  "20:31 · John D. — Drink",
  "20:00 · Aisha T. — Medication",
  "19:40 · Priya L. — Activity",
  "19:05 · Robert W. — Incident",
  "18:45 · John D. — Food",
];

const NAV = ["Dashboard", "Participants", "Shifts", "Incidents", "Reports"];

export default function CairaAdmin() {
  return (
    <div className="flex min-h-screen bg-[#f4f1ea] text-foreground">
      {/* Sidebar */}
      <aside className="flex w-[230px] flex-none flex-col gap-1.5 border-r border-border bg-surface p-4 pt-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-brand">
            <CairaMark />
          </span>
          <span className="font-display text-lg font-extrabold text-brand">{APP_NAME}</span>
        </Link>
        {NAV.map((item, i) => (
          <div
            key={item}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
              i === 0 ? "bg-brand-tint text-brand" : "text-muted hover:bg-surface-sunk"
            }`}
          >
            {i === 0 && <span className="h-2 w-2 rounded-[3px] bg-brand" aria-hidden />}
            {item}
          </div>
        ))}
        <Link
          href="/admin/settings"
          className="mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-sunk"
        >
          Settings
        </Link>
        <div className="mt-2 flex items-center gap-2.5 border-t border-border px-2 py-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#dbe7e4] font-display text-xs font-bold text-brand">
            EM
          </span>
          <div>
            <div className="text-xs font-bold text-foreground">Ellie M.</div>
            <div className="text-[10px] text-muted">Coordinator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-surface px-7">
          <div className="font-display text-lg font-bold text-foreground">Good afternoon, Ellie</div>
          <div className="flex items-center gap-3">
            <div className="flex h-[38px] w-[280px] items-center rounded-xl border border-border bg-[#f4f1ea] px-3.5 text-xs text-muted">
              Search participants…
            </div>
            <span className="flex h-[38px] items-center gap-2 rounded-full border border-[#efd5cb] bg-[#f7e7e0] py-0 pl-2 pr-3.5">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-clay">
                <PhoneIcon />
              </span>
              <span className="text-[11px] font-extrabold tracking-wide text-[#bd6149]">On-call</span>
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Centre column */}
          <section className="flex-1 overflow-auto p-7">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
                  <div className="text-[11px] text-muted">{s.label}</div>
                  <div className="mt-1 font-display text-[28px] font-extrabold" style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-3.5 mt-6 font-display text-[15px] font-bold text-foreground">On shift now</h2>
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {ON_SHIFT.map((p) => (
                <div
                  key={p.initials}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)]"
                >
                  <span
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-display text-[15px] font-bold"
                    style={{ background: p.tint, color: p.fg }}
                  >
                    {p.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">
                      {p.name} <span className="text-[10px] font-medium text-muted">· {p.room}</span>
                    </div>
                    <div className="text-[11px] text-muted">{p.last}</div>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.state === "ON" ? "#34a07f" : "#d2a596" }}
                      aria-hidden
                    />
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: p.state === "ON" ? "#2f7d63" : "#ad9087" }}
                    >
                      {p.state}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Right column */}
          <aside className="flex w-[330px] flex-none flex-col gap-2.5 border-l border-border bg-surface p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Needs attention</div>
            {ATTENTION.map((a) => (
              <div key={a.title} className="rounded-2xl p-3.5" style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.dot }} aria-hidden />
                  <span className="text-xs font-bold" style={{ color: a.titleColor }}>
                    {a.title}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-muted">{a.body}</div>
              </div>
            ))}

            <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Recent activity</div>
            <div className="text-[11px] leading-loose text-muted">
              {RECENT.map((r) => (
                <div key={r}>{r}</div>
              ))}
            </div>

            <p className="mt-auto pt-4 text-[10px] text-muted">
              Prototype · sample data only · do not enter real participant information
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Caira logo mark: a heart with a "C" carved into the upper-left lobe (white on teal).
function CairaMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <path
        d="M32 49 C10 34 11 17 23 17 C28.5 17 31.5 21 32 24 C32.5 21 35.5 17 41 17 C53 17 54 34 32 49 Z"
        fill="#fff"
      />
      <path
        d="M29.5 18.5 A9 9 0 1 0 29.5 35.5"
        fill="none"
        stroke="#0f766e"
        strokeWidth="5.5"
        strokeLinecap="round"
        transform="rotate(-18 21 27)"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.1 2.2z" />
    </svg>
  );
}
