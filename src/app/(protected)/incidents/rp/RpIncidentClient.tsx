"use client";

// Restrictive-Practice (RP) capture — tablet / shared hub iPad.
// Rebuilt to MATCH docs/design/Caira RP Incident.dc.html: a left rail of
// pre-filled context + a right capture pane that flows
// type → details → review → done, via two paths (Quick tap | Dictate) that
// converge on one review-before-save. Calm clay throughout, never red.
//
// All actions but the final save are local capture state. reportIncident
// persists; the mic fills a SAMPLE transcript (no real audio / transcription).
// Dummy data only — no PII to external APIs.

import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { reportIncident } from "@/lib/incident-actions";

// eMAR row shape — handed in from the server (page.tsx). adminId is the
// administration cross-reference so the same dose isn't recorded twice.
export type EmarMed = {
  medicationId: string;
  name: string;
  dose: string;
  kind: string; // "PRN" | "Routine"
  time: string;
  adminId: string;
};

type Mode = "quick" | "dictate";
type Step = "type" | "details" | "review" | "done";

type RpType =
  | "PHYSICAL"
  | "CHEMICAL"
  | "MECHANICAL"
  | "ENVIRONMENTAL"
  | "SECLUSION";

// Design vocabulary → backend rpType enum.
const TYPE_TO_RP: Record<string, RpType> = {
  "Physical restraint": "PHYSICAL",
  "Chemical restraint": "CHEMICAL",
  "Mechanical restraint": "MECHANICAL",
  "Environmental restraint": "ENVIRONMENTAL",
  Seclusion: "SECLUSION",
};

const DURATIONS = ["Under 1 min", "1–2 min", "2–5 min", "5–10 min", "Over 10 min"];
const DURATION_MINUTES: Record<string, number> = {
  "Under 1 min": 1,
  "1–2 min": 2,
  "2–5 min": 5,
  "5–10 min": 10,
  "Over 10 min": 15,
};
const TRIGGERS = [
  "Escalating aggression",
  "Risk to others",
  "Risk to self",
  "Property damage",
  "Tried to leave unsafely",
];
const STRATEGIES = [
  "Verbal de-escalation",
  "Offered space",
  "Redirected activity",
  "Reduced demands",
  "Removed the trigger",
  "Called for support",
];
const INJURIES = ["None", "Minor — no first aid", "First aid given", "Needs review"];
const IMMEDIATE = [
  "Stayed with him",
  "Monitored closely",
  "Offered reassurance",
  "Checked breathing",
  "Recorded straight away",
  "Told the team lead",
];
const OUTCOMES = [
  "Calm and settled",
  "Resting quietly",
  "Re-engaged in activity",
  "Still agitated",
  "Sleeping",
];
const ROUTINE = ["Routine", "PRN"];
const EMERGENCY_TYPES = [
  "Physical restraint",
  "Chemical restraint",
  "Mechanical restraint",
  "Environmental restraint",
  "Seclusion",
];
const TRANSCRIPT =
  "Zef became distressed around 2:30, escalating to aggression toward another resident. I tried verbal de-escalation and offered him space first. With a risk to others I used a brief supporting hold for about two minutes. No injuries — he is calm and resting now.";

const font = (spec: string): CSSProperties => ({ font: spec } as CSSProperties);

type RpIncidentClientProps = {
  participantId: string | null;
  participantName: string;
  workerName: string;
  orgName: string;
  emar: EmarMed[];
  bspReference: string;
  bspAuthorisedPractices: string[];
  reportingWindowHours: number;
  initialMode: Mode;
};

export default function RpIncidentClient({
  participantId,
  participantName,
  workerName,
  orgName,
  emar,
  bspReference,
  bspAuthorisedPractices,
  reportingWindowHours,
  initialMode,
}: RpIncidentClientProps) {
  const name = participantName || "Zef";

  const [mode, setMode] = useState<Mode>(initialMode || "quick");
  const [step, setStep] = useState<Step>("type");
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const [rpLabel, setRpLabel] = useState<string | null>(null);
  const [authorised, setAuthorised] = useState<boolean | null>(null);

  const [duration, setDuration] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [injury, setInjury] = useState<string | null>(null);
  const [med, setMed] = useState<EmarMed | null>(null);
  const [routineOrPrn, setRoutineOrPrn] = useState<string | null>(null);
  const [immediate, setImmediate] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");
  const [recording, setRecording] = useState(false);
  const [notify, setNotify] = useState({ guardian: true, commission: true });

  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reportable = authorised === false;
  const isChemical = rpLabel === "Chemical restraint";
  const isDictate = mode === "dictate";

  const now = new Date();
  const timeLabel =
    String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

  const toggleArr = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    v: string
  ) => setter((a) => (a.includes(v) ? a.filter((x) => x !== v) : a.concat(v)));

  function pickType(label: string, isAuthorised: boolean) {
    setRpLabel(label);
    setAuthorised(isAuthorised);
    setStep("details");
  }

  function back() {
    if (step === "review") {
      setStep("details");
    } else {
      setStep("type");
      setEmergencyOpen(false);
      setRpLabel(null);
      setAuthorised(null);
    }
  }

  function toggleRecording() {
    if (recording) {
      setRecording(false);
      if (!narrative) setNarrative(TRANSCRIPT);
    } else {
      setRecording(true);
    }
  }

  function resetAll() {
    setStep("type");
    setEmergencyOpen(false);
    setRpLabel(null);
    setAuthorised(null);
    setDuration(null);
    setTriggers([]);
    setStrategies([]);
    setInjury(null);
    setMed(null);
    setRoutineOrPrn(null);
    setImmediate([]);
    setOutcome(null);
    setNarrative("");
    setRecording(false);
    setNotify({ guardian: true, commission: true });
    setRef(null);
    setError(null);
  }

  // ---- gating ---------------------------------------------------------------
  let canReview: boolean;
  if (isDictate) canReview = !!rpLabel && narrative.trim().length > 0;
  else if (isChemical) canReview = !!med && !!routineOrPrn;
  else canReview = !!rpLabel && !!duration && !!injury;

  // ---- live summary ---------------------------------------------------------
  const summary = useMemo(() => {
    const s: { k: string; v: string }[] = [];
    s.push({ k: "Type", v: rpLabel || "—" });
    s.push({
      k: "Authorisation",
      v:
        authorised == null
          ? "—"
          : authorised
            ? `Under ${bspReference}`
            : "Unauthorised / emergency",
    });
    if (isChemical) {
      if (med) s.push({ k: "Medication", v: `${med.name} · ${med.dose}` });
      if (routineOrPrn) s.push({ k: "Routine / PRN", v: routineOrPrn });
    } else if (rpLabel) {
      if (duration) s.push({ k: "Duration", v: duration });
      if (triggers.length) s.push({ k: "Trigger", v: triggers.join(", ") });
      if (strategies.length) s.push({ k: "Tried first", v: strategies.join(", ") });
      if (injury) s.push({ k: "Injury", v: injury });
    }
    if (immediate.length) s.push({ k: "Immediate action", v: immediate.join(", ") });
    if (outcome) s.push({ k: "Outcome", v: outcome });
    if (narrative) s.push({ k: "Note", v: narrative });
    return s;
  }, [
    rpLabel,
    authorised,
    bspReference,
    isChemical,
    med,
    routineOrPrn,
    duration,
    triggers,
    strategies,
    injury,
    immediate,
    outcome,
    narrative,
  ]);

  const nextSteps = reportable
    ? [
        "This RP record is held on the org's audit trail, hash-chain verified.",
        `A reportable-incident notification goes to the NDIS Commission within ${reportingWindowHours} hours.`,
        `The coordinator and ${name}'s nominee are notified now.`,
        `It appears on ${name}'s shared timeline, attributed to you.`,
      ]
    : [
        "This RP record is held on the org's audit trail, hash-chain verified.",
        `It appears on ${name}'s shared timeline, attributed to you.`,
        "The behaviour support team can review it against the plan.",
      ];

  // ---- save -----------------------------------------------------------------
  function save() {
    setError(null);
    const rpType = rpLabel ? TYPE_TO_RP[rpLabel] : undefined;
    if (!rpType) {
      setError("Pick a restrictive-practice type.");
      return;
    }

    const descriptionParts = summary.map((r) => `${r.k}: ${r.v}`);
    const description = narrative.trim() || descriptionParts.join(". ");
    const immediateAction = immediate.length ? immediate.join(", ") : undefined;

    startTransition(async () => {
      const result = await reportIncident({
        type: "behavioural",
        severity: reportable ? "critical" : "high",
        description,
        immediateAction,
        participantId: participantId ?? undefined,
        notified: {
          supervisor: true,
          guardian: reportable ? notify.guardian : undefined,
          commission: reportable ? notify.commission : undefined,
        },
        reportable: reportable || undefined,
        restrictivePractice: {
          rpType,
          rpAuthorised: authorised === true,
          rpRoutineOrPrn: isChemical
            ? routineOrPrn === "PRN"
              ? "PRN"
              : routineOrPrn === "Routine"
                ? "ROUTINE"
                : null
            : null,
          rpMedication: isChemical && med ? med.name : null,
          rpDose: isChemical && med ? med.dose : null,
          rpDurationMinutes:
            !isChemical && duration ? (DURATION_MINUTES[duration] ?? null) : null,
          lessRestrictiveTried: strategies.length ? strategies.join(", ") : null,
          bspReference: authorised ? bspReference : null,
          medicationAdminId: isChemical && med ? med.adminId : null,
        },
      });

      if (!result.ok) {
        setError(result.error || "Couldn't save the record. Try again.");
        return;
      }
      const fallback =
        "RP-" +
        new Date().getFullYear() +
        "-" +
        String(Math.floor(Date.now() / 1000) % 10000).padStart(4, "0");
      setRef(result.incidentId || fallback);
      setStep("done");
    });
  }

  // ---- chip / pill helpers --------------------------------------------------
  function chipStyle(selected: boolean): CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 16px",
      minHeight: 50,
      borderRadius: 14,
      border: "1px solid " + (selected ? "var(--brand)" : "var(--border)"),
      background: selected ? "var(--brand-tint)" : "var(--surface)",
      color: selected ? "var(--brand-strong)" : "var(--foreground)",
      font: "600 15px var(--font-sans-base)",
      cursor: "pointer",
      transition: "background .15s ease, border-color .15s ease",
      textAlign: "left",
    };
  }

  const Chip = ({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick} style={chipStyle(selected)}>
      {label}
    </button>
  );

  const SingleChips = ({
    list,
    value,
    onPick,
  }: {
    list: string[];
    value: string | null;
    onPick: (v: string) => void;
  }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {list.map((x) => (
        <Chip key={x} label={x} selected={value === x} onClick={() => onPick(x)} />
      ))}
    </div>
  );

  const MultiChips = ({
    list,
    values,
    setter,
  }: {
    list: string[];
    values: string[];
    setter: React.Dispatch<React.SetStateAction<string[]>>;
  }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {list.map((x) => (
        <Chip key={x} label={x} selected={values.includes(x)} onClick={() => toggleArr(setter, x)} />
      ))}
    </div>
  );

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <span style={font("600 14px var(--font-sans-base)")} className="text-foreground">
      {children}
    </span>
  );

  const Eyebrow = ({
    children,
    color = "var(--muted)",
  }: {
    children: ReactNode;
    color?: string;
  }) => (
    <span
      style={{
        font: "700 11px var(--font-sans-base)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </span>
  );

  const cardStyle: CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow-soft)",
    padding: 20,
  };

  const stepTitle =
    step === "type"
      ? "What happened?"
      : step === "details"
        ? isDictate
          ? "Describe it"
          : rpLabel || "Details"
        : step === "review"
          ? "Check and save"
          : "Saved";
  const stepHint =
    step === "type"
      ? "Tap the practice used — most of the record is already filled in."
      : step === "details"
        ? isDictate
          ? "Speak the narrative, then read it back before saving."
          : "A few quick confirmations — nothing here is free typing unless you want it."
        : step === "review"
          ? "You can edit anything before it's committed."
          : "";

  const micLabel = recording
    ? "Listening… tap to stop"
    : narrative
      ? "Tap to add more"
      : "Tap to start dictating";

  const showBanner = reportable && step !== "done" && step !== "type";
  const showModeToggle = step === "type" || step === "details";
  const showFooter = step === "details" || step === "review";

  // ===========================================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        padding: 28,
        fontFamily: "var(--font-sans-base)",
        color: "var(--foreground)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* ============ LEFT RAIL ============ */}
        <div
          style={{
            flex: "1 1 320px",
            minWidth: 300,
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name="Caira" size={30} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Eyebrow color="var(--clay-strong)">Restrictive practice</Eyebrow>
                <span
                  style={{
                    font: "700 19px var(--font-display)",
                    letterSpacing: "-0.01em",
                    color: "var(--foreground)",
                  }}
                >
                  Incident record
                </span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={name} size={50} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span
                    style={{
                      font: "700 22px var(--font-display)",
                      letterSpacing: "-0.01em",
                      color: "var(--foreground)",
                    }}
                  >
                    {name}
                  </span>
                  <span style={font("400 14px var(--font-sans-base)")} className="text-muted">
                    Acquired brain injury · BSP in place
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge tone="neutral">3:1 support</Badge>
                <Badge tone="brand">Behaviour support plan</Badge>
              </div>
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <Eyebrow>Authorising plan</Eyebrow>
                <span style={font("600 14px var(--font-sans-base)")} className="text-foreground">
                  {bspReference} · reviewed Apr 2026
                </span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow color="var(--status)">On shift · {timeLabel}</Eyebrow>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={workerName} size={38} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={font("600 15px var(--font-sans-base)")} className="text-foreground">
                    {workerName}
                  </span>
                  <span style={font("400 13px var(--font-sans-base)")} className="text-muted">
                    Support worker · {orgName}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  background: "var(--surface-sunk)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <circle cx="8" cy="15" r="4" />
                  <path d="M10.85 12.15 19 4" />
                  <path d="m18 5 2 2" />
                  <path d="m15 8 2 2" />
                </svg>
                <span
                  style={{
                    font: "400 13px var(--font-sans-base)",
                    color: "var(--muted)",
                    lineHeight: 1.45,
                  }}
                >
                  Auto-selected from check-in · confirmed by PIN. The actor is always tapped to
                  confirm.
                </span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Eyebrow>This record so far</Eyebrow>
              {summary.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      font: "400 13px var(--font-sans-base)",
                      color: "var(--muted)",
                      flexShrink: 0,
                    }}
                  >
                    {row.k}
                  </span>
                  <span
                    style={{
                      font: "600 14px var(--font-sans-base)",
                      color: "var(--foreground)",
                      textAlign: "right",
                    }}
                  >
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ RIGHT PANE ============ */}
        <div
          style={{
            flex: "3 1 480px",
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minHeight: 660,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            boxShadow: "var(--shadow-soft)",
            padding: 26,
          }}
        >
          {/* header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 240px" }}>
              <span
                style={{
                  font: "700 26px var(--font-display)",
                  letterSpacing: "-0.01em",
                  color: "var(--foreground)",
                }}
              >
                {stepTitle}
              </span>
              <span
                style={{
                  font: "400 15px var(--font-sans-base)",
                  color: "var(--muted)",
                  lineHeight: 1.45,
                }}
              >
                {stepHint}
              </span>
            </div>
            {showModeToggle && (
              <div style={{ minWidth: 208 }}>
                <Segmented
                  value={mode}
                  onChange={(v) => setMode(v as Mode)}
                  options={[
                    { value: "quick", label: "Quick tap" },
                    { value: "dictate", label: "Dictate" },
                  ]}
                />
              </div>
            )}
          </div>

          {/* reportable banner */}
          {showBanner && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "var(--clay-tint)",
                border: "1px solid var(--clay-tint)",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <WarnIcon />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "700 15px var(--font-sans-base)", color: "var(--clay-strong)" }}>
                  Reportable to the NDIS Commission
                </span>
                <span
                  style={{
                    font: "400 14px var(--font-sans-base)",
                    color: "var(--clay-strong)",
                    opacity: 0.85,
                    lineHeight: 1.45,
                  }}
                >
                  Due within {reportingWindowHours}h of the event. The right people are notified at
                  the review step — no separate form to chase.
                </span>
              </div>
            </div>
          )}

          {/* ===== STEP: TYPE ===== */}
          {step === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Eyebrow>Authorised under {name}'s plan</Eyebrow>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {bspAuthorisedPractices.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => pickType(label, true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        width: "100%",
                        textAlign: "left",
                        padding: "18px 20px",
                        minHeight: 84,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        transition: "background .15s ease, border-color .15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: "var(--brand-tint)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--brand-strong)"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            font: "700 18px var(--font-display)",
                            letterSpacing: "-0.01em",
                            color: "var(--foreground)",
                          }}
                        >
                          {label}
                        </span>
                        <span style={{ font: "400 14px var(--font-sans-base)", color: "var(--muted)" }}>
                          One tap · authorised under {bspReference}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Eyebrow>Outside the plan</Eyebrow>
                {emergencyOpen ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span
                      style={{ font: "400 14px var(--font-sans-base)", color: "var(--clay-strong)" }}
                    >
                      This is the serious branch — it's recorded as a reportable incident. Select the
                      practice used:
                    </span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {EMERGENCY_TYPES.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => pickType(label, false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            textAlign: "left",
                            padding: "14px 16px",
                            minHeight: 64,
                            borderRadius: 14,
                            border: "1px solid var(--clay-tint)",
                            background: "var(--clay-tint)",
                            cursor: "pointer",
                            transition: "background .15s ease",
                          }}
                        >
                          <WarnIcon size={20} />
                          <span
                            style={{
                              font: "700 15px var(--font-sans-base)",
                              color: "var(--clay-strong)",
                            }}
                          >
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEmergencyOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 18px",
                      minHeight: 60,
                      borderRadius: 14,
                      border: "1px dashed var(--clay)",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "background .15s ease",
                    }}
                  >
                    <WarnIcon size={20} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span
                        style={{
                          font: "700 15px var(--font-sans-base)",
                          color: "var(--clay-strong)",
                        }}
                      >
                        Unauthorised or emergency use
                      </span>
                      <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)" }}>
                        Anything not covered by the current plan
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== STEP: DETAILS ===== */}
          {step === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* dictate */}
              {isDictate && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 96,
                      height: 96,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {recording && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 999,
                          background: "var(--clay)",
                          animation: "rpPulse 1.6s ease-out infinite",
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      style={{
                        position: "relative",
                        width: 84,
                        height: 84,
                        borderRadius: 999,
                        border: "none",
                        background: "var(--clay)",
                        boxShadow: "var(--shadow-soft)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background .15s ease",
                      }}
                    >
                      <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                      </svg>
                    </button>
                  </div>
                  <span style={font("600 15px var(--font-sans-base)")} className="text-foreground">
                    {micLabel}
                  </span>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <Textarea
                      value={narrative}
                      onChange={setNarrative}
                      rows={5}
                      placeholder="Voice transcription is coming soon — type the narrative here, or dictate above and edit it."
                    />
                    <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)" }}>
                      Read it back before saving — nothing is committed unreviewed.
                    </span>
                  </div>
                </div>
              )}

              {/* quick: chemical */}
              {!isDictate && isChemical && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FieldLabel>Medication — picked from the eMAR</FieldLabel>
                  {emar.map((m) => {
                    const selected = !!med && med.adminId === m.adminId;
                    return (
                      <button
                        key={m.adminId}
                        type="button"
                        onClick={() => setMed(m)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          width: "100%",
                          padding: "14px 16px",
                          minHeight: 60,
                          borderRadius: 14,
                          border: "1px solid " + (selected ? "var(--brand)" : "var(--border)"),
                          background: selected ? "var(--brand-tint)" : "var(--surface)",
                          color: "var(--foreground)",
                          cursor: "pointer",
                          transition: "background .15s ease, border-color .15s ease",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: "var(--brand-tint)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--brand-strong)"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="2.5"
                                y="8.5"
                                width="19"
                                height="7"
                                rx="3.5"
                                transform="rotate(-45 12 12)"
                              />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span
                              style={{
                                font: "700 15px var(--font-sans-base)",
                                color: "var(--foreground)",
                              }}
                            >
                              {m.name} · {m.dose}
                            </span>
                            <span
                              style={{
                                font: "400 13px var(--font-sans-base)",
                                color: "var(--muted)",
                              }}
                            >
                              {m.kind} · last given {m.time}
                            </span>
                          </span>
                        </span>
                        <span
                          style={{
                            font: "700 12px var(--font-sans-base)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--muted)",
                          }}
                        >
                          {m.adminId}
                        </span>
                      </button>
                    );
                  })}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}
                  >
                    <FieldLabel>Routine or PRN</FieldLabel>
                    <SingleChips list={ROUTINE} value={routineOrPrn} onPick={setRoutineOrPrn} />
                  </div>
                  <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)" }}>
                    Linked to the eMAR so the same dose isn't recorded twice.
                  </span>
                </div>
              )}

              {/* quick: physical / other */}
              {!isDictate && !!rpLabel && !isChemical && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>How long</FieldLabel>
                    <SingleChips list={DURATIONS} value={duration} onPick={setDuration} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>What was happening</FieldLabel>
                    <MultiChips list={TRIGGERS} values={triggers} setter={setTriggers} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>Tried first — least-restrictive options</FieldLabel>
                    <MultiChips list={STRATEGIES} values={strategies} setter={setStrategies} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>Any injury</FieldLabel>
                    <SingleChips list={INJURIES} value={injury} onPick={setInjury} />
                  </div>
                </div>
              )}

              {/* both (non-dictate) */}
              {!isDictate && !!rpLabel && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 18,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>Immediate action</FieldLabel>
                    <MultiChips list={IMMEDIATE} values={immediate} setter={setImmediate} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FieldLabel>How is {name} now</FieldLabel>
                    <SingleChips list={OUTCOMES} value={outcome} onPick={setOutcome} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP: REVIEW ===== */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  background: "var(--surface-sunk)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {summary.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 20,
                        alignItems: "baseline",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          font: "600 13px var(--font-sans-base)",
                          color: "var(--muted)",
                          flexShrink: 0,
                        }}
                      >
                        {row.k}
                      </span>
                      <span
                        style={{
                          font: "600 15px var(--font-sans-base)",
                          color: "var(--foreground)",
                          textAlign: "right",
                        }}
                      >
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FieldLabel>Note</FieldLabel>
                <Textarea
                  value={narrative}
                  onChange={setNarrative}
                  rows={3}
                  placeholder="Add or edit the narrative before saving (optional)."
                />
              </div>

              {reportable && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Eyebrow>Who gets notified</Eyebrow>
                  <NotifyRow label={`Coordinator — ${orgName}`} sub="Notified automatically" on locked />
                  <NotifyRow
                    label="Guardian / nominee"
                    sub={`${name}'s mother`}
                    on={notify.guardian}
                    onToggle={() => setNotify((n) => ({ ...n, guardian: !n.guardian }))}
                  />
                  <NotifyRow
                    label="NDIS Commission"
                    sub="Reportable-incident form"
                    on={notify.commission}
                    onToggle={() => setNotify((n) => ({ ...n, commission: !n.commission }))}
                  />
                </div>
              )}

              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: "var(--clay-tint)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <WarnIcon size={18} />
                  <span
                    style={{ font: "400 14px var(--font-sans-base)", color: "var(--clay-strong)" }}
                  >
                    {error}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP: DONE ===== */}
          {step === "done" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 16,
                padding: "24px 0 8px",
              }}
            >
              <span
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: "var(--status-bg)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--status)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  style={{
                    font: "800 28px var(--font-display)",
                    letterSpacing: "-0.01em",
                    color: "var(--foreground)",
                  }}
                >
                  Record saved
                </span>
                <span style={{ font: "400 15px var(--font-sans-base)", color: "var(--muted)" }}>
                  Reference{" "}
                  <span style={{ font: "700 15px var(--font-display)", color: "var(--foreground)" }}>
                    {ref}
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {reportable ? (
                  <Badge tone="clay">Reportable · Commission notified</Badge>
                ) : (
                  <Badge tone="status">Recorded · authorised</Badge>
                )}
              </div>
              <div
                style={{
                  width: "100%",
                  background: "var(--surface-sunk)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    textAlign: "left",
                  }}
                >
                  <Eyebrow>What happens next</Eyebrow>
                  {nextSteps.map((n, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--brand)"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span
                        style={{
                          font: "400 14px var(--font-sans-base)",
                          color: "var(--foreground)",
                          lineHeight: 1.45,
                        }}
                      >
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== FOOTER ===== */}
          {showFooter && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginTop: "auto",
                paddingTop: 18,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                {step === "details" && (
                  <Btn variant="ghost" onClick={back}>
                    ← Back
                  </Btn>
                )}
                {step === "review" && (
                  <Btn variant="ghost" onClick={() => setStep("details")}>
                    Edit details
                  </Btn>
                )}
              </div>
              <div>
                {step === "details" && (
                  <Btn variant="primary" lg onClick={() => setStep("review")} disabled={!canReview}>
                    Review record
                  </Btn>
                )}
                {step === "review" && (
                  <Btn variant="primary" lg onClick={save} disabled={pending}>
                    {pending ? "Saving…" : "Save record"}
                  </Btn>
                )}
              </div>
            </div>
          )}

          {step === "done" && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                marginTop: "auto",
                paddingTop: 18,
                borderTop: "1px solid var(--border)",
              }}
            >
              <Btn variant="secondary" onClick={resetAll}>
                Log another
              </Btn>
              <Btn variant="primary" onClick={resetAll}>
                Back to {name}'s timeline
              </Btn>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes rpPulse { 0%{ transform:scale(1); opacity:.55; } 70%{ transform:scale(1.55); opacity:0; } 100%{ transform:scale(1.55); opacity:0; } }
        @media (prefers-reduced-motion: reduce){ span[style*="rpPulse"]{ animation:none !important; } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational primitives (stand in for the design system imports).
// ---------------------------------------------------------------------------

function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "var(--brand-tint)",
        color: "var(--brand-strong)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        font: `700 ${Math.round(size * 0.38)}px var(--font-display)`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

function Badge({ tone, children }: { tone: "neutral" | "brand" | "clay" | "status"; children: ReactNode }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "var(--surface-sunk)", fg: "var(--muted)" },
    brand: { bg: "var(--brand-tint)", fg: "var(--brand-strong)" },
    clay: { bg: "var(--clay-tint)", fg: "var(--clay-strong)" },
    status: { bg: "var(--status-bg)", fg: "var(--status)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 10px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        font: "700 12px var(--font-sans-base)",
      }}
    >
      {children}
    </span>
  );
}

function WarnIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--clay-strong)"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        height: 52,
        borderRadius: 14,
        background: "var(--surface-sunk)",
        border: "1px solid var(--border)",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--foreground)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-soft)" : "none",
              font: "600 15px var(--font-sans-base)",
              transition: "background .15s ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        resize: "vertical",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--foreground)",
        font: "400 15px var(--font-sans-base)",
        lineHeight: 1.45,
        outline: "none",
      }}
    />
  );
}

function NotifyRow({
  label,
  sub,
  on,
  locked,
  onToggle,
}: {
  label: string;
  sub: string;
  on: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 15px var(--font-sans-base)", color: "var(--foreground)" }}>
          {label}
        </span>
        <span style={{ font: "400 13px var(--font-sans-base)", color: "var(--muted)" }}>{sub}</span>
      </div>
      <button
        type="button"
        onClick={() => !locked && onToggle?.()}
        aria-pressed={on}
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          border: "none",
          cursor: locked ? "default" : "pointer",
          padding: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: on ? "flex-end" : "flex-start",
          background: on ? "var(--brand)" : "var(--surface-sunk)",
          opacity: locked ? 0.7 : 1,
          transition: "background .15s ease",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "#fff",
            boxShadow: "var(--shadow-soft)",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}

function Btn({
  children,
  variant,
  lg,
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant: "primary" | "secondary" | "ghost";
  lg?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base: CSSProperties = {
    height: lg ? 56 : 48,
    padding: lg ? "0 26px" : "0 20px",
    borderRadius: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    font: "700 15px var(--font-sans-base)",
    border: "1px solid transparent",
    transition: "background .15s ease, opacity .15s ease",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: "var(--brand)", color: "#fff" },
    secondary: {
      background: "var(--surface)",
      color: "var(--foreground)",
      border: "1px solid var(--border)",
    },
    ghost: { background: "transparent", color: "var(--muted)" },
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}
