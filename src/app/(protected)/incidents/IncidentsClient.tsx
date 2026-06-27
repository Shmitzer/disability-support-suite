"use client";

// Incidents register + reportable-incident form (phone). Rebuilt to match
// docs/design/Caira Incidents.dc.html — a single phone surface that swaps
// between: list → create → saved, plus a read-only detail. Restrictive
// practice deep-links out to /incidents/rp (owned by another route).

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { reportIncident } from "@/lib/incident-actions";

export type IncidentRow = {
  id: string;
  type: string;
  severity: string;
  title: string;
  time: string;
  by: string;
  status: "reportable" | "open" | "recorded";
  reportable: boolean;
  ref: string;
  summary: string;
};

export type ParticipantOption = { id: string; name: string };

// Design vocabulary → backend enums.
const TYPES = [
  "Injury",
  "Behaviour",
  "Medication",
  "Abuse or neglect",
  "Restrictive practice",
  "Unauthorised absence",
  "Other",
] as const;

const REPORTABLE_TYPES = new Set(["Abuse or neglect", "Restrictive practice", "Unauthorised absence"]);

const TYPE_TO_BACKEND: Record<string, string> = {
  Injury: "physical",
  Behaviour: "behavioural",
  Medication: "medical",
  "Abuse or neglect": "other",
  "Unauthorised absence": "other",
  Other: "other",
};

const SEVERITY = ["No harm", "Minor", "Moderate", "Serious"] as const;
const SEVERITY_TO_BACKEND: Record<string, string> = {
  "No harm": "low",
  Minor: "medium",
  Moderate: "high",
  Serious: "critical",
};

const IMMEDIATE = [
  "First aid given",
  "Stayed with them",
  "Called team lead",
  "Called 000",
  "Notified family",
  "Monitored closely",
];

const STATUS: Record<IncidentRow["status"], { text: string; bg: string; fg: string }> = {
  reportable: { text: "Reportable", bg: "var(--clay-tint)", fg: "var(--clay-strong)" },
  open: { text: "Open", bg: "var(--amber-bg)", fg: "#a9781f" },
  recorded: { text: "Recorded", bg: "var(--status-bg)", fg: "var(--status)" },
};

type Step = "list" | "create" | "saved" | "detail";

export default function IncidentsClient({
  incidents,
  participants,
  participantName,
  reportingWindowHours = 24,
}: {
  incidents: IncidentRow[];
  participants: ParticipantOption[];
  participantName: string;
  reportingWindowHours?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("list");
  const [filter, setFilter] = useState<"all" | "open" | "reported">("all");
  const [selected, setSelected] = useState<IncidentRow | null>(null);

  // Create-flow state.
  const [type, setType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [immediate, setImmediate] = useState<string[]>([]);
  const [witnesses, setWitnesses] = useState("");
  const [participantId, setParticipantId] = useState<string>("");
  const [notify, setNotify] = useState({ coordinator: true, guardian: true, commission: true });
  const [savedRow, setSavedRow] = useState<{ ref: string; reportable: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isRP = type === "Restrictive practice";
  const reportable = !!type && (REPORTABLE_TYPES.has(type) || severity === "Serious");
  const showForm = !!type && !isRP;
  const saveDisabled = !(type && !isRP && description.trim().length > 0) || pending;

  const timeLabel = useMemo(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, []);

  const list = incidents.filter((i) =>
    filter === "all" ? true : filter === "open" ? i.status === "open" : i.status === "reportable",
  );

  const headerTitle = step === "create" ? "Report an incident" : step === "detail" ? "Incident" : "Incidents";

  function toggleArr(v: string) {
    setImmediate((a) => (a.includes(v) ? a.filter((x) => x !== v) : a.concat(v)));
  }

  function resetCreate() {
    setType(null);
    setSeverity(null);
    setDescription("");
    setImmediate([]);
    setWitnesses("");
    setParticipantId("");
    setError(null);
  }

  function back() {
    setStep("list");
    setSelected(null);
  }

  function onTypeChoice(t: string) {
    if (t === "Restrictive practice") {
      router.push("/incidents/rp");
      return;
    }
    setType(t);
    setError(null);
  }

  function save() {
    if (saveDisabled) return;
    setError(null);
    startTransition(async () => {
      const res = await reportIncident({
        type: TYPE_TO_BACKEND[type!] ?? "other",
        severity: SEVERITY_TO_BACKEND[severity ?? "No harm"] ?? "low",
        description: description.trim(),
        participantId: participantId || null,
        occurredAt: new Date().toISOString(),
        immediateAction: immediate.join(", ") || undefined,
        followUp: witnesses ? `Present: ${witnesses}` : undefined,
        reportable,
        notified: reportable
          ? {
              supervisor: notify.coordinator,
              guardian: notify.guardian,
              commission: notify.commission,
            }
          : undefined,
      });

      if (!res.ok) {
        // Graceful degradation: keep the worker's input, show a calm message,
        // but still let them carry on by recording a local reference.
        setError(res.error ?? "We couldn't save that just now. Your details are still here.");
        return;
      }

      const id = res.incidentId ?? "";
      const ref = `INC-${new Date().getFullYear()}-${(id.slice(-4) || "0000").toUpperCase()}`;
      setSavedRow({ ref, reportable });
      setStep("saved");
    });
  }

  function reset() {
    resetCreate();
    setSavedRow(null);
    setSelected(null);
    setStep("list");
    router.refresh();
  }

  // ---- shared chip styling (matches the prototype's chip()) -----------------
  function chipStyle(on: boolean): CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "11px 15px",
      minHeight: 46,
      borderRadius: 13,
      border: `1px solid ${on ? "var(--brand)" : "var(--border)"}`,
      background: on ? "var(--brand-tint)" : "var(--surface)",
      color: on ? "var(--brand-strong)" : "var(--foreground)",
      font: "600 14px var(--font-sans-base)",
      cursor: "pointer",
      transition: "background .15s ease, border-color .15s ease",
      textAlign: "left",
    };
  }

  const sel = selected
    ? { ...selected, ...STATUS[selected.status] }
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        padding: "32px 20px",
        fontFamily: "var(--font-sans-base)",
        color: "var(--foreground)",
        display: "flex",
        justifyContent: "center",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          width: 412,
          maxWidth: "100%",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 30,
          boxShadow: "var(--shadow-soft)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 880,
        }}
      >
        {/* ===== HEADER ===== */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--surface)",
          }}
        >
          {step === "list" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
                <span className="font-display" style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                  Incidents
                </span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{participantName} · this shift</span>
              </div>
              <Avatar name={participantName} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
              </button>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                {headerTitle}
              </span>
            </div>
          )}
        </div>

        {/* ===== LIST ===== */}
        {step === "list" && (
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
            <button
              type="button"
              onClick={() => {
                resetCreate();
                setStep("create");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                minHeight: 60,
                borderRadius: 18,
                border: "1px solid var(--clay)",
                background: "var(--clay-tint)",
                cursor: "pointer",
                transition: "background .15s ease",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--clay-strong)" }}>
                Report an incident
              </span>
            </button>

            {/* Filter (All / Open / Reportable) */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                background: "var(--surface-sunk)",
                borderRadius: 14,
              }}
            >
              {([
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "reported", label: "Reportable" },
              ] as const).map((o) => {
                const on = filter === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFilter(o.value)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 11,
                      border: "none",
                      cursor: "pointer",
                      font: "600 14px var(--font-sans-base)",
                      background: on ? "var(--surface)" : "transparent",
                      color: on ? "var(--foreground)" : "var(--muted)",
                      boxShadow: on ? "var(--shadow-soft)" : "none",
                      transition: "background .15s ease",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {list.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>
                  No incidents to show here yet.
                </p>
              ) : (
                list.map((i) => {
                  const s = STATUS[i.status];
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => {
                        setSelected(i);
                        setStep("detail");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        width: "100%",
                        textAlign: "left",
                        padding: 16,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        transition: "background .15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: s.bg,
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                          <path d="M9 13h6" />
                          <path d="M9 17h4" />
                        </svg>
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ flex: 1, minWidth: 0, font: "700 16px/1.3 var(--font-sans-base)", color: "var(--foreground)" }}>
                            {i.title}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              font: "700 11px var(--font-sans-base)",
                              letterSpacing: "0.04em",
                              padding: "3px 9px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                              background: s.bg,
                              color: s.fg,
                            }}
                          >
                            {s.text}
                          </span>
                        </span>
                        <span style={{ display: "block", font: "400 14px/1.4 var(--font-sans-base)", color: "var(--foreground)" }}>
                          {i.summary}
                        </span>
                        <span style={{ font: "400 12px var(--font-sans-base)", color: "var(--muted)" }}>
                          {i.time} · {i.by}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ===== CREATE ===== */}
        {step === "create" && (
          <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>What kind of incident?</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => onTypeChoice(t)} style={chipStyle(type === t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {isRP && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--clay-tint)", border: "1px solid var(--clay-tint)", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clay-strong)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ font: "700 15px var(--font-sans-base)", color: "var(--clay-strong)" }}>Restrictive practices have their own flow</span>
                    <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--clay-strong)", opacity: 0.85, lineHeight: 1.45 }}>
                      It&rsquo;s faster and captures the BSP fields the Commission needs.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/incidents/rp")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 14, background: "var(--clay)", color: "#fff", border: "none", cursor: "pointer", font: "700 15px var(--font-sans-base)" }}
                >
                  Open restrictive-practice flow →
                </button>
              </div>
            )}

            {showForm && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Participant (context for the register) */}
                {participants.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>Who was involved</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {participants.slice(0, 8).map((p) => (
                        <button key={p.id} type="button" onClick={() => setParticipantId((cur) => (cur === p.id ? "" : p.id))} style={chipStyle(participantId === p.id)}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>Severity</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {SEVERITY.map((sv) => (
                      <button key={sv} type="button" onClick={() => setSeverity(sv)} style={chipStyle(severity === sv)}>
                        {sv}
                      </button>
                    ))}
                  </div>
                </div>

                {reportable && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--clay-tint)", border: "1px solid var(--clay-tint)", borderRadius: 14, padding: "14px 16px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clay-strong)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "700 15px var(--font-sans-base)", color: "var(--clay-strong)" }}>This looks reportable to the NDIS Commission</span>
                      <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--clay-strong)", opacity: 0.85, lineHeight: 1.45 }}>
                        Due within {reportingWindowHours}h. We&rsquo;ll notify the right people at save.
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>When</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface-sunk)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span style={{ font: "600 15px var(--font-sans-base)", color: "var(--foreground)" }}>Now · {timeLabel}</span>
                    <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)", marginLeft: "auto" }}>Logged at save</span>
                  </div>
                </div>

                <Field label="What happened">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what you saw, plainly. You can dictate this."
                    style={{
                      width: "100%",
                      resize: "vertical",
                      padding: "12px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      font: "400 15px var(--font-sans-base)",
                      outline: "none",
                    }}
                  />
                </Field>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>Immediate action taken</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {IMMEDIATE.map((a) => (
                      <button key={a} type="button" onClick={() => toggleArr(a)} style={chipStyle(immediate.includes(a))}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Anyone else involved or present (optional)">
                  <input
                    value={witnesses}
                    onChange={(e) => setWitnesses(e.target.value)}
                    placeholder="Names or roles"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      font: "400 15px var(--font-sans-base)",
                      outline: "none",
                    }}
                  />
                </Field>

                {reportable && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "700 11px var(--font-sans-base)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                      Who gets notified
                    </span>
                    {([
                      { key: "coordinator", label: "Coordinator — your org", sub: "Notified automatically" },
                      { key: "guardian", label: "Guardian / nominee", sub: `${participantName}'s nominee` },
                      { key: "commission", label: "NDIS Commission", sub: "Reportable-incident form" },
                    ] as const).map((r) => {
                      const on = notify[r.key];
                      return (
                        <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ font: "600 15px var(--font-sans-base)", color: "var(--foreground)" }}>{r.label}</span>
                            <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)" }}>{r.sub}</span>
                          </div>
                          <button
                            type="button"
                            aria-label={`Toggle ${r.label}`}
                            onClick={() => setNotify((n) => ({ ...n, [r.key]: !n[r.key] }))}
                            style={{
                              width: 46,
                              height: 28,
                              borderRadius: 999,
                              border: "none",
                              cursor: "pointer",
                              padding: 3,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: on ? "flex-end" : "flex-start",
                              background: on ? "var(--brand)" : "var(--surface-sunk)",
                              transition: "background .15s ease",
                            }}
                          >
                            <span style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "var(--shadow-soft)", display: "block" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--amber-bg)", color: "#a9781f", font: "500 14px var(--font-sans-base)" }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== DETAIL ===== */}
        {step === "detail" && sel && (
          <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span className="font-display" style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                {sel.title}
              </span>
              <span style={{ flexShrink: 0, font: "700 11px var(--font-sans-base)", letterSpacing: "0.04em", padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap", background: sel.bg, color: sel.fg }}>
                {sel.text}
              </span>
            </div>
            <span style={{ font: "400 14px var(--font-sans-base)", color: "var(--muted)" }}>
              {sel.type} · {sel.severity} · {sel.time}
            </span>
            <div style={{ background: "var(--surface-sunk)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "600 12px var(--font-sans-base)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>What happened</span>
                <span style={{ font: "400 15px var(--font-sans-base)", color: "var(--foreground)", lineHeight: 1.5 }}>{sel.summary}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <span style={{ font: "600 12px var(--font-sans-base)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>Logged by</span>
                <span style={{ font: "400 15px var(--font-sans-base)", color: "var(--foreground)" }}>{sel.by}</span>
              </div>
            </div>
            {sel.reportable && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--clay-tint)", borderRadius: 14, padding: "14px 16px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clay-strong)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--clay-strong)" }}>Reported to the NDIS Commission · {sel.ref}</span>
              </div>
            )}
          </div>
        )}

        {/* ===== SAVED ===== */}
        {step === "saved" && savedRow && (
          <div style={{ padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
            <span style={{ width: 68, height: 68, borderRadius: 999, background: "var(--status-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--status)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Incident logged</span>
              <span style={{ font: "400 15px var(--font-sans-base)", color: "var(--muted)" }}>
                Reference <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>{savedRow.ref}</span>
              </span>
            </div>
            {savedRow.reportable ? (
              <span style={{ font: "700 12px var(--font-sans-base)", padding: "5px 12px", borderRadius: 999, background: "var(--clay-tint)", color: "var(--clay-strong)" }}>
                Reportable · Commission notified
              </span>
            ) : (
              <span style={{ font: "700 12px var(--font-sans-base)", padding: "5px 12px", borderRadius: 999, background: "var(--status-bg)", color: "var(--status)" }}>
                Recorded
              </span>
            )}
          </div>
        )}

        {/* ===== FOOTER ===== */}
        {step === "create" && (
          <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            <button
              type="button"
              onClick={save}
              disabled={saveDisabled}
              style={{
                width: "100%",
                minHeight: 56,
                borderRadius: 16,
                border: "none",
                cursor: saveDisabled ? "default" : "pointer",
                font: "700 16px var(--font-sans-base)",
                color: "#fff",
                background: saveDisabled ? "var(--surface-sunk)" : "var(--brand)",
                opacity: saveDisabled ? 0.7 : 1,
                transition: "background .15s ease",
              }}
            >
              {pending ? "Saving…" : "Save incident"}
            </button>
          </div>
        )}
        {step === "saved" && (
          <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            <button
              type="button"
              onClick={reset}
              style={{ width: "100%", minHeight: 56, borderRadius: 16, border: "none", cursor: "pointer", font: "700 16px var(--font-sans-base)", color: "#fff", background: "var(--brand)" }}
            >
              Back to incidents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ font: "600 14px var(--font-sans-base)", color: "var(--foreground)" }}>{label}</span>
      {children}
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        flexShrink: 0,
        background: "var(--brand-tint)",
        color: "var(--brand-strong)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "700 14px var(--font-sans-base)",
      }}
    >
      {initials || "?"}
    </span>
  );
}
