"use client";

// eMAR-lite (phone) — medication record. Rebuilt to match
// docs/design/Caira eMAR.dc.html: a single phone surface with a compact
// card/row list (NOT a chart grid). Sections: Due now (amber, Give / Withhold /
// Refused — Withhold & Refused expand an inline reason picker passed as `note`),
// Later today, PRN — as needed, Done. Chemical-restraint PRN carries a clay note
// and, once given, cross-references the restrictive-practice flow (/incidents/rp).

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { recordAdministration } from "@/lib/medication-actions";

export type MedRow = {
  id: string;
  name: string;
  dose: string;
  route: string;
  restraint: boolean;
  group: "due" | "later" | "prn" | "done";
  time: string | null;
  sub: string;
  status: "given" | "withheld" | "refused" | null;
  by: string | null;
  at: string | null;
  reason: string | null;
};

const WITHHOLD_REASONS = ["Asleep", "Clinically withheld", "Not available", "Nil by mouth"];
const REFUSE_REASONS = ["Declined", "Spat it out", "Too distressed"];

const STATUS_PILL: Record<
  NonNullable<MedRow["status"]>,
  { text: string; bg: string; fg: string }
> = {
  given: { text: "Given", bg: "var(--status-bg)", fg: "var(--status)" },
  withheld: { text: "Withheld", bg: "var(--surface)", fg: "var(--muted)" },
  refused: { text: "Refused", bg: "var(--clay-tint)", fg: "var(--clay-strong)" },
};

// status (ui) → backend enum for recordAdministration.
const UI_TO_BACKEND: Record<"given" | "withheld" | "refused" | "prn", string> = {
  given: "GIVEN",
  withheld: "WITHHELD",
  refused: "REFUSED",
  prn: "PRN_GIVEN",
};

// Meds category accent (meds-pink) — the chart pill in the design.
const MEDS_FILL = "#f3c2d8";
const MEDS_INK = "#962f63";

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function MedsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={MEDS_INK} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export default function EmarClient({
  participantName,
  participantId,
  today,
  meds: initialMeds,
  usingDummy,
}: {
  participantName: string;
  participantId: string | null;
  today: string;
  meds: MedRow[];
  usingDummy: boolean;
}) {
  const [meds, setMeds] = useState<MedRow[]>(initialMeds);
  // The med currently expanding its inline reason picker.
  const [pending, setPending] = useState<{ id: string; mode: "withhold" | "refuse" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  // Optimistically move a med into Done (or mark a PRN given), then persist.
  // On {ok:false} we roll the row back and surface a calm message.
  function persist(
    id: string,
    backendStatus: string,
    patch: Partial<MedRow>,
    note?: string,
  ) {
    const prev = meds;
    setMeds((rows) => rows.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setPending((p) => (p && p.id === id ? null : p));
    setError(null);

    // Dummy chart (no real medication ids) → optimistic only, nothing to save.
    if (usingDummy || id.startsWith("d-")) return;

    startTransition(async () => {
      const res = await recordAdministration({
        medicationId: id,
        status: backendStatus,
        note,
        scheduledAt: null,
      });
      if (!res.ok) {
        setMeds(prev);
        setError(res.error ?? "We couldn't record that just now. Please try again.");
      }
    });
  }

  function give(id: string) {
    const m = meds.find((r) => r.id === id);
    const backend = m?.group === "prn" ? UI_TO_BACKEND.prn : UI_TO_BACKEND.given;
    persist(id, backend, {
      group: m?.group === "prn" ? "prn" : "done",
      status: "given",
      by: "You",
      at: now(),
      reason: null,
    });
  }

  function pickReason(id: string, mode: "withhold" | "refuse", reason: string) {
    const status = mode === "withhold" ? "withheld" : "refused";
    persist(
      id,
      UI_TO_BACKEND[status],
      { group: "done", status, by: "You", at: now(), reason },
      reason,
    );
  }

  const dueMeds = useMemo(() => meds.filter((m) => m.group === "due" && !m.status), [meds]);
  const laterMeds = useMemo(() => meds.filter((m) => m.group === "later" && !m.status), [meds]);
  const prnMeds = useMemo(() => meds.filter((m) => m.group === "prn"), [meds]);
  // Given/withheld/refused scheduled doses land in Done. (Given PRN stays inline
  // in the PRN section with its time chip, matching the prototype.)
  const doneRows = useMemo(() => meds.filter((m) => m.group === "done" && m.status), [meds]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", justifyContent: "center", padding: "0", color: "var(--foreground)" }}>
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
        {/* HEADER */}
        <div style={{ flexShrink: 0, padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: MEDS_FILL, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MedsIcon size={18} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
            <span className="font-display" style={{ font: "800 21px var(--font-display)", letterSpacing: "-0.01em", color: "var(--foreground)" }}>Medications</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{participantName} · {today}</span>
          </div>
          <span style={{ font: "700 12px var(--font-sans-base)", color: "var(--amber)", background: "var(--amber-bg)", padding: "5px 11px", borderRadius: 999, flexShrink: 0 }}>
            {dueMeds.length} due
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          {error && (
            <div role="status" style={{ font: "600 13px var(--font-sans-base)", color: "var(--clay-strong)", background: "var(--clay-tint)", padding: "11px 13px", borderRadius: 12 }}>
              {error}
            </div>
          )}

          {/* DUE NOW */}
          {dueMeds.length > 0 && (
            <Section label="Due now" labelColor="var(--amber)">
              {dueMeds.map((m) => {
                const open = pending?.id === m.id;
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, border: "1px solid var(--amber)", borderRadius: 18, background: "var(--surface)" }}>
                    <MedHead m={m} iconSize={42} svg={20} nameSize={17} subtitle={`${m.route}${m.time ? ` · scheduled ${m.time}` : ""}`} />
                    {!open ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => give(m.id)} disabled={saving} style={primaryBtn(true)}>Give</button>
                        <button type="button" onClick={() => setPending({ id: m.id, mode: "withhold" })} style={secondaryBtn()}>Withhold</button>
                        <button type="button" onClick={() => setPending({ id: m.id, mode: "refuse" })} style={refusedBtn()}>Refused</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <span style={{ font: "600 13px var(--font-sans-base)", color: "var(--foreground)" }}>
                          {pending!.mode === "withhold" ? "Why withheld?" : "Why refused?"}
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(pending!.mode === "withhold" ? WITHHOLD_REASONS : REFUSE_REASONS).map((r) => (
                            <button key={r} type="button" onClick={() => pickReason(m.id, pending!.mode, r)} style={reasonChip()}>{r}</button>
                          ))}
                          <button type="button" onClick={() => setPending(null)} style={{ ...reasonChip(), color: "var(--muted)" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {/* LATER TODAY */}
          {laterMeds.length > 0 && (
            <Section label="Later today" labelColor="var(--muted)">
              {laterMeds.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface)" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: MEDS_FILL, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0.85 }}>
                    <MedsIcon size={18} />
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ font: "600 15px var(--font-sans-base)", color: "var(--foreground)" }}>{m.name} · {m.dose}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{m.route}</span>
                  </div>
                  {m.time && <span className="font-display" style={{ font: "700 14px var(--font-display)", color: "var(--muted)", flexShrink: 0 }}>{m.time}</span>}
                </div>
              ))}
            </Section>
          )}

          {/* PRN — AS NEEDED */}
          {prnMeds.length > 0 && (
            <Section label="As needed · PRN" labelColor="var(--muted)">
              {prnMeds.map((m) => {
                const given = m.status === "given";
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 11, background: MEDS_FILL, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MedsIcon size={19} />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{ font: "700 16px var(--font-sans-base)", color: "var(--foreground)" }}>{m.name} · {m.dose}</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{m.sub}</span>
                      </div>
                      {given ? (
                        <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, font: "700 13px var(--font-sans-base)", color: "var(--status)", background: "var(--status-bg)", padding: "6px 11px", borderRadius: 999 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--status)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          {m.at}
                        </span>
                      ) : (
                        <button type="button" onClick={() => give(m.id)} disabled={saving} style={{ ...primaryBtn(false), minHeight: 44, padding: "0 16px", flexShrink: 0 }}>Give PRN</button>
                      )}
                    </div>
                    {/* Chemical restraint: pre-give clay prompt → post-give RP cross-reference. */}
                    {m.restraint && !given && (
                      <span style={{ fontSize: 12, color: "var(--clay-strong)", background: "var(--clay-tint)", padding: "8px 12px", borderRadius: 10 }}>
                        Chemical restraint · this dose also logs as a restrictive practice.
                      </span>
                    )}
                    {m.restraint && given && (
                      <Link href="/incidents/rp" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: "var(--clay-tint)", borderRadius: 12, padding: "11px 13px" }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--clay-strong)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        <span style={{ font: "600 13px var(--font-sans-base)", color: "var(--clay-strong)", flex: 1, lineHeight: 1.35 }}>
                          Chemical restraint — also records as a restrictive practice. Open RP flow →
                        </span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {/* DONE */}
          {doneRows.length > 0 && (
            <Section label="Done" labelColor="var(--muted)">
              {doneRows.map((m) => {
                const p = STATUS_PILL[m.status!];
                const doneLine =
                  m.status === "given"
                    ? `Given ${m.at} · ${m.by}`
                    : `${p.text} ${m.at} · ${m.by}${m.reason ? ` · ${m.reason}` : ""}`;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface-sunk)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                      <span style={{ font: "600 15px var(--font-sans-base)", color: "var(--foreground)" }}>{m.name} · {m.dose}</span>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{doneLine}</span>
                    </div>
                    <span style={{ flexShrink: 0, font: "700 12px var(--font-sans-base)", letterSpacing: "0.03em", padding: "5px 11px", borderRadius: 999, background: p.bg, color: p.fg }}>
                      {p.text}
                    </span>
                  </div>
                );
              })}
            </Section>
          )}

          <footer style={{ marginTop: "auto", paddingTop: 8, textAlign: "center", fontSize: 11, color: "var(--text-faint)" }}>
            Development build · sample data only · do not enter real participant information
          </footer>
        </div>
      </div>
    </div>
  );
}

function Section({ label, labelColor, children }: { label: string; labelColor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ font: "700 11px var(--font-sans-base)", letterSpacing: "0.12em", textTransform: "uppercase", color: labelColor }}>{label}</span>
      {children}
    </div>
  );
}

function MedHead({ m, iconSize, svg, nameSize, subtitle }: { m: MedRow; iconSize: number; svg: number; nameSize: number; subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
      <span style={{ width: iconSize, height: iconSize, borderRadius: 12, background: MEDS_FILL, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <MedsIcon size={svg} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ font: `700 ${nameSize}px var(--font-sans-base)`, color: "var(--foreground)" }}>{m.name} · {m.dose}</span>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>{subtitle}</span>
      </div>
    </div>
  );
}

// --- Button styling (matches the prototype's Button variants) ----------------
function primaryBtn(fullWidth: boolean): CSSProperties {
  return {
    flex: fullWidth ? 1 : undefined,
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 14,
    border: "none",
    background: "var(--brand)",
    color: "#fff",
    font: "700 15px var(--font-sans-base)",
    cursor: "pointer",
  };
}

function secondaryBtn(): CSSProperties {
  return {
    minHeight: 48,
    padding: "0 16px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
    font: "600 15px var(--font-sans-base)",
    cursor: "pointer",
  };
}

function refusedBtn(): CSSProperties {
  return {
    minHeight: 48,
    padding: "0 16px",
    borderRadius: 14,
    border: "1px solid var(--clay-tint)",
    background: "var(--clay-tint)",
    color: "var(--clay-strong)",
    font: "600 15px var(--font-sans-base)",
    cursor: "pointer",
  };
}

function reasonChip(): CSSProperties {
  return {
    padding: "9px 14px",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
    font: "600 14px var(--font-sans-base)",
    cursor: "pointer",
  };
}
