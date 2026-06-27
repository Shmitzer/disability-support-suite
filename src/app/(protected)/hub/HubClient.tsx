"use client";

// HubClient — the Participant Hub interactive UI (the shared-iPad "care station").
//
// Server component (page.tsx) opens/reuses the participant session and gathers the
// "on shift now" actors + cross-org timeline, then hands interactivity here:
//   tap-to-identify → PIN sheet → (capacity pick if ambiguous) → "Logging as…" →
//   quick-log tiles → Lock.
//
// Rebuilt from docs/design/Caira Participant Hub.dc.html (tablet, three columns).
// Dummy data only; the real writes go through @/lib/hub-actions server actions.

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { hubCheckIn, hubCheckOut, logHubEntry } from "@/lib/hub-actions";
import { LOG_CATEGORIES } from "@/lib/log-categories";

// ── Prop shapes (must match how page.tsx builds them) ───────────────────────────────

export type HubWorker = {
  id: string;
  name: string;
  org: string;
  onShift: boolean;
  hasPin: boolean;
  shiftId: string | null;
  accessGrantId: string | null;
  ambiguous: boolean;
};

export type HubCapacity = "WORKER" | "FAMILY" | "GUARDIAN";

export type HubTimelineItem = {
  id: string;
  actorName: string;
  org: string;
  capacity: HubCapacity;
  category: string;
  summary: string;
  timestamp: string;
};

type HubClientProps = {
  participantId: string;
  participantName: string;
  sessionId: string | null;
  sessionError: string | null;
  workers: HubWorker[];
  onShiftCount: number;
  timeline: HubTimelineItem[];
  timelineError: string | null;
};

// ── Capacity → badge styling (Worker=teal/brand, Family=amber, Guardian=clay) ────────

const CAP_META: Record<
  HubCapacity,
  { label: string; full: string; badge: string }
> = {
  WORKER: {
    label: "Worker",
    full: "Support worker",
    badge: "bg-brand-tint text-brand-strong",
  },
  FAMILY: {
    label: "Family",
    full: "Family carer",
    badge: "bg-amber-bg text-[#a9781f]",
  },
  GUARDIAN: {
    label: "Guardian",
    full: "Guardian",
    badge: "bg-clay-tint text-clay-strong",
  },
};

// The six quick-log category tiles (Paper categories) + Note, mapped to LOG_CATEGORIES
// labels so the server receives a category key it actually offers.
const QUICK_LABELS = ["Food", "Drink", "Hygiene", "Activity", "Toilet", "Medication"] as const;

function quickCategory(label: string) {
  return LOG_CATEGORIES.find((c) => c.label === label);
}

// Avatar — there's no caira Avatar component, so render calm initials in a tinted disc.
function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-display font-bold text-brand-strong"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ActiveActor = {
  checkInId: string;
  workerId: string;
  name: string;
  org: string;
  capacity: HubCapacity;
  // The PIN the worker confirmed at check-in, held in memory for the session so each
  // quick-log re-attests as them (the server re-verifies it on every entry). Cleared
  // on Lock — the shared-device safeguard. Never persisted.
  pin: string;
};

export function HubClient({
  participantName,
  sessionId,
  sessionError,
  workers,
  onShiftCount,
  timeline: initialTimeline,
  timelineError,
}: HubClientProps) {
  const [timeline, setTimeline] = useState<HubTimelineItem[]>(initialTimeline);
  const [active, setActive] = useState<ActiveActor | null>(null);
  const [locked, setLocked] = useState(false);

  // PIN sheet state.
  const [pinFor, setPinFor] = useState<HubWorker | null>(null);
  const [pinDigits, setPinDigits] = useState("");
  // Capacity pick (after PIN, for ambiguous actors). Carries the verified PIN.
  const [capacityFor, setCapacityFor] = useState<{ worker: HubWorker; pin: string } | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loggingDisabled = !sessionId;

  const closeModals = useCallback(() => {
    setPinFor(null);
    setPinDigits("");
    setCapacityFor(null);
  }, []);

  // Tap a worker → open the PIN sheet (unless the device is the actively-locked one).
  const tapWorker = useCallback(
    (w: HubWorker) => {
      if (loggingDisabled) {
        setNotice("No live hub session — logging is paused.");
        return;
      }
      setNotice(null);
      setLocked(false);
      setPinFor(w);
      setPinDigits("");
    },
    [loggingDisabled],
  );

  // Check in a worker in a given capacity (WORKER → shiftId, FAMILY/GUARDIAN → grant).
  const doCheckIn = useCallback(
    async (worker: HubWorker, capacity: HubCapacity, pin: string) => {
      if (!sessionId) {
        setNotice("No live hub session — logging is paused.");
        return;
      }
      setBusy(true);
      setNotice(null);
      const res = await hubCheckIn({
        hubSessionId: sessionId,
        workerId: worker.id,
        capacity,
        pin,
        shiftId: capacity === "WORKER" ? worker.shiftId : null,
        accessGrantId: capacity === "WORKER" ? null : worker.accessGrantId,
      });
      setBusy(false);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      // If we were already logged in as someone else, check them out.
      if (active) hubCheckOut(active.checkInId);
      setActive({
        checkInId: res.checkInId,
        workerId: worker.id,
        name: worker.name,
        org: worker.org,
        capacity,
        pin,
      });
      setLocked(false);
      closeModals();
    },
    [sessionId, active, closeModals],
  );

  // PIN entry: 4 digits demo-confirms (server enforces real PIN). Ambiguous actors go
  // to the capacity pick carrying the entered PIN; everyone else checks in as WORKER.
  const pushDigit = useCallback(
    (d: string) => {
      if (!pinFor || busy) return;
      const next = pinDigits + d;
      if (next.length < 4) {
        setPinDigits(next);
        return;
      }
      // 4 digits reached.
      const worker = pinFor;
      setPinDigits("");
      setPinFor(null);
      if (worker.ambiguous) {
        setCapacityFor({ worker, pin: next });
      } else {
        void doCheckIn(worker, "WORKER", next);
      }
    },
    [pinFor, pinDigits, busy, doCheckIn],
  );

  const delDigit = useCallback(() => setPinDigits((s) => s.slice(0, -1)), []);

  const lock = useCallback(() => {
    if (active) hubCheckOut(active.checkInId);
    setActive(null);
    setLocked(true);
    closeModals();
    setNotice(null);
  }, [active, closeModals]);

  // Quick-log: stamp an entry against the active check-in (PIN re-supplied to the action).
  const log = useCallback(
    async (categoryKey: string, categoryLabel: string, summary: string) => {
      if (loggingDisabled) {
        setNotice("No live hub session — logging is paused.");
        return;
      }
      if (!active) {
        setNotice("Tap your photo above to start logging — every entry is signed to you.");
        return;
      }
      setBusy(true);
      const res = await logHubEntry({
        hubCheckInId: active.checkInId,
        category: categoryKey,
        notes: summary,
        idempotencyKey: crypto.randomUUID(),
        // Re-attest with the PIN the worker confirmed at check-in (held in memory for
        // this session, cleared on Lock). The server re-verifies it against the hash.
        pin: active.pin,
        sourceDevice: "TABLET",
      });
      setBusy(false);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      // Optimistically prepend to the shared timeline.
      setTimeline((t) => [
        {
          id: res.entryId,
          actorName: active.name,
          org: active.org,
          capacity: active.capacity,
          category: categoryLabel,
          summary,
          timestamp: new Date().toISOString(),
        },
        ...t,
      ]);
    },
    [active, loggingDisabled],
  );

  const activeMeta = active ? CAP_META[active.capacity] : null;
  const pinDots = useMemo(() => [0, 1, 2, 3].map((i) => i < pinDigits.length), [pinDigits]);

  return (
    <div
      className="relative min-h-screen bg-surface-2 p-6 text-foreground"
      style={{ ["--radius" as string]: "1rem" }}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
        {/* ===== TOP BAR ===== */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              {participantName}&rsquo;s care station
            </span>
            <span className="text-[13px] text-muted">
              Shared iPad · {sessionId ? "Hub session open" : "No live session"}
            </span>
          </div>
          <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full bg-status-bg px-[13px] py-[7px] text-xs font-bold tracking-wide text-status">
            <span className="h-2 w-2 shrink-0 rounded-full bg-status" />
            {onShiftCount} on shift
          </span>
          <button
            type="button"
            onClick={lock}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-muted hover:bg-surface-2"
          >
            <LockIcon size={17} />
            Lock
          </button>
        </div>

        {/* Calm error surfacing. */}
        {(sessionError || notice) && (
          <div className="rounded-[var(--radius)] bg-amber-bg px-[18px] py-3 text-sm font-medium text-[#a9781f]">
            {sessionError ?? notice}
          </div>
        )}

        {/* ===== THREE COLUMNS ===== */}
        <div className="flex flex-wrap items-start gap-[18px]">
          {/* LEFT: identity */}
          <div className="flex min-w-[240px] max-w-[300px] flex-[1_1_260px] flex-col gap-4">
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-soft">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-[14px]">
                  <Avatar name={participantName} size={56} />
                  <div className="flex flex-col gap-[2px]">
                    <span className="font-display text-[23px] font-extrabold tracking-tight text-foreground">
                      {participantName}
                    </span>
                    <span className="text-[13px] text-muted">3:1 support · TBI</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-[14px]">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    Care context
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    Impaired impulse control. Authorised physical &amp; chemical restraint under
                    BSP-0417.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-tint px-[10px] py-1 text-[11px] font-semibold text-brand-strong">
                    BSP in place
                  </span>
                  <span className="rounded-full bg-amber-bg px-[10px] py-1 text-[11px] font-semibold text-[#a9781f]">
                    Seizure care
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-border bg-surface p-[18px] shadow-soft">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  Key contact
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-clay px-4 text-sm font-semibold text-white"
                >
                  On-call · Priya
                </button>
              </div>
            </div>
          </div>

          {/* CENTER: capture */}
          <div className="flex min-w-[340px] flex-[2_1_460px] flex-col gap-4">
            {/* on-shift row */}
            <div className="rounded-[var(--radius)] border border-border bg-surface p-[18px] shadow-soft">
              <div className="flex flex-col gap-[14px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  On shift now · tap to log as you
                </span>
                <div className="flex flex-wrap gap-3">
                  {workers.length === 0 && (
                    <span className="text-sm text-muted">No one linked to tap yet.</span>
                  )}
                  {workers.map((w) => {
                    const isActive = active?.workerId === w.id;
                    const capShort = w.ambiguous ? "Worker / family" : "Support worker";
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => tapWorker(w)}
                        className={`flex items-center gap-[11px] rounded-2xl border py-[10px] pl-[10px] pr-[14px] transition-colors ${
                          isActive
                            ? "border-brand bg-brand-tint"
                            : "border-border bg-surface hover:bg-surface-2"
                        }`}
                      >
                        <span className="relative">
                          <Avatar name={w.name} size={52} />
                          {isActive && (
                            <span className="absolute -bottom-[2px] -right-[2px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-status ring-[2.5px] ring-surface">
                              <CheckIcon />
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 flex-col items-start gap-[2px]">
                          <span className="whitespace-nowrap text-sm font-bold text-foreground">
                            {w.name}
                          </span>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {w.org} · {capShort}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* active / prompt banner */}
            {active && activeMeta ? (
              <div className="flex items-center gap-[13px] rounded-2xl bg-brand-tint px-[18px] py-[14px]">
                <Avatar name={active.name} size={40} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold text-brand-strong">
                    Logging as {active.name}
                  </span>
                  <span className="text-[13px] text-brand-strong opacity-85">
                    {active.org} · {activeMeta.full}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={lock}
                  className="cursor-pointer p-[6px] text-[13px] font-semibold text-brand-strong"
                >
                  Switch / lock
                </button>
              </div>
            ) : (
              !locked && (
                <div className="flex items-center gap-[10px] rounded-2xl bg-amber-bg px-[18px] py-[14px]">
                  <BagIcon />
                  <span className="text-sm font-semibold text-[#a9781f]">
                    {loggingDisabled
                      ? "No live hub session — logging is paused, but the screen stays calm."
                      : "Tap your photo above to start logging — every entry is signed to you."}
                  </span>
                </div>
              )
            )}

            {/* quick-log grid */}
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-soft">
              <div className="flex flex-col gap-[14px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  Quick log
                </span>
                <div className="grid grid-cols-4 gap-3">
                  {QUICK_LABELS.map((label) => {
                    const cat = quickCategory(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={loggingDisabled}
                        onClick={() =>
                          cat && log(cat.key, cat.label, `${cat.label} logged`)
                        }
                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-border bg-surface p-3 transition-colors hover:bg-surface-2 disabled:opacity-50"
                      >
                        <span className="text-[30px] leading-none" aria-hidden>
                          {cat?.emoji ?? "•"}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                  {/* Note */}
                  <button
                    type="button"
                    disabled={loggingDisabled}
                    onClick={() => log("Note", "Note", "Free note added")}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-border bg-surface p-3 transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    <NoteIcon />
                    <span className="text-[13px] font-semibold text-foreground">Note</span>
                  </button>
                  {/* Report incident → incident register */}
                  <Link
                    href="/incidents"
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[20px] border border-clay bg-clay-tint p-3 no-underline transition-colors hover:opacity-90"
                  >
                    <AlertIcon />
                    <span className="text-center text-xs font-bold tracking-wide text-clay-strong">
                      Report incident
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: shared timeline */}
          <div className="flex min-w-[300px] flex-[1.4_1_320px] flex-col gap-[14px]">
            <div className="rounded-[var(--radius)] border border-border bg-surface shadow-soft">
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-[18px] pb-3 pt-4">
                  <span className="font-display text-base font-bold text-foreground">
                    Shared timeline
                  </span>
                  <span className="text-xs text-muted">all orgs · {timeline.length} today</span>
                </div>

                {/* presence cue */}
                <div className="mx-[18px] mb-2 flex items-center gap-[10px] rounded-xl bg-surface-2 px-3 py-[10px]">
                  <span className="relative h-2 w-2 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full bg-status" />
                    <span className="absolute inset-0 rounded-full bg-status" />
                  </span>
                  <span className="text-[13px] font-medium text-muted">Aria is adding a note…</span>
                </div>

                {timelineError && (
                  <div className="mx-[18px] mb-2 rounded-xl bg-amber-bg px-3 py-[10px] text-[13px] text-[#a9781f]">
                    {timelineError}
                  </div>
                )}

                <div className="flex max-h-[560px] flex-col overflow-y-auto px-[6px] pb-2">
                  {timeline.length === 0 && !timelineError && (
                    <div className="px-3 py-6 text-sm text-muted">
                      No entries yet — the first quick-log appears here.
                    </div>
                  )}
                  {timeline.map((e) => {
                    const m = CAP_META[e.capacity] ?? CAP_META.WORKER;
                    return (
                      <div key={e.id} className="flex gap-3 p-3">
                        <span className="shrink-0">
                          <Avatar name={e.actorName} size={36} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <div className="flex flex-wrap items-center gap-[7px]">
                            <span className="text-sm font-bold text-foreground">{e.actorName}</span>
                            <span
                              className={`rounded-full px-2 py-[2px] text-[11px] font-semibold tracking-[0.03em] ${m.badge}`}
                            >
                              {m.label}
                            </span>
                            {e.org && <span className="text-xs text-muted">{e.org}</span>}
                          </div>
                          <span className="text-sm leading-snug text-foreground">
                            <span className="font-semibold">{e.category}</span>
                            {e.summary ? ` · ${e.summary}` : ""}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted">
                          {fmtTime(e.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PIN SHEET ===== */}
      {pinFor && (
        <Overlay onClose={closeModals}>
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="flex w-[360px] max-w-full flex-col items-center gap-[18px] rounded-3xl bg-surface px-6 py-[26px] shadow-soft"
          >
            <Avatar name={pinFor.name} size={58} />
            <div className="flex flex-col items-center gap-[3px] text-center">
              <span className="font-display text-lg font-bold text-foreground">{pinFor.name}</span>
              <span className="text-sm text-muted">Enter your PIN to log as you</span>
            </div>
            <div className="flex gap-[14px]">
              {pinDots.map((on, i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 ${
                    on ? "border-brand bg-brand" : "border-border bg-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="grid w-full grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <PinKey key={n} label={n} onClick={() => pushDigit(n)} />
              ))}
              <span />
              <PinKey label="0" onClick={() => pushDigit("0")} />
              <PinKey label="⌫" muted onClick={delDigit} />
            </div>
            <span className="text-xs text-faint">
              Full login once · then a PIN tap. Demo: any 4 digits.
            </span>
          </div>
        </Overlay>
      )}

      {/* ===== CAPACITY PICK ===== */}
      {capacityFor && (
        <Overlay onClose={closeModals}>
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="flex w-[380px] max-w-full flex-col gap-[18px] rounded-3xl bg-surface px-6 py-[26px] shadow-soft"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-display text-[19px] font-bold text-foreground">
                How is {capacityFor.worker.name} here today?
              </span>
              <span className="text-sm text-muted">
                Capacity is recorded on every entry they log.
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <CapacityChoice
                tone="brand"
                title="Support worker"
                subtitle="Paid shift · billable to her practice · EVV"
                icon={<UsersIcon />}
                onClick={() => doCheckIn(capacityFor.worker, "WORKER", capacityFor.pin)}
              />
              <CapacityChoice
                tone="amber"
                title="Family carer"
                subtitle="Unpaid family input · not billed"
                icon={<HeartIcon />}
                onClick={() => doCheckIn(capacityFor.worker, "FAMILY", capacityFor.pin)}
              />
            </div>
          </div>
        </Overlay>
      )}

      {/* ===== LOCKED OVERLAY ===== */}
      {locked && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-[rgb(45_44_40/0.55)] px-6 pb-6 pt-16">
          <div className="flex w-[560px] max-w-full flex-col items-center gap-5 rounded-[26px] bg-surface p-8 shadow-soft">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-surface-2">
              <LockIcon size={30} />
            </span>
            <div className="flex flex-col items-center gap-[5px] text-center">
              <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                Care station locked
              </span>
              <span className="text-sm text-muted">
                Shared device · tap your photo to log as you. Session stays open for{" "}
                {participantName}.
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-[14px]">
              {workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => tapWorker(w)}
                  className="flex w-[152px] flex-col items-center gap-2 rounded-[18px] border border-border bg-surface p-3 hover:border-brand hover:bg-surface-2"
                >
                  <Avatar name={w.name} size={56} />
                  <span className="whitespace-nowrap text-center text-sm font-bold text-foreground">
                    {w.name}
                  </span>
                  <span className="whitespace-nowrap text-center text-xs text-muted">{w.org}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────────────

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-20 flex items-start justify-center bg-[rgb(43_42_38/0.42)] px-6 pb-6 pt-16"
    >
      {children}
    </div>
  );
}

function PinKey({
  label,
  onClick,
  muted,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[58px] rounded-[14px] border border-border bg-surface font-display text-[22px] font-semibold ${
        muted ? "text-muted" : "text-foreground"
      } hover:bg-surface-2`}
    >
      {label}
    </button>
  );
}

function CapacityChoice({
  tone,
  title,
  subtitle,
  icon,
  onClick,
}: {
  tone: "brand" | "amber";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const hover = tone === "brand" ? "hover:border-brand" : "hover:border-amber";
  const iconBg = tone === "brand" ? "bg-brand-tint" : "bg-amber-bg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-[14px] rounded-2xl border border-border bg-surface px-[18px] py-4 text-left hover:bg-surface-2 ${hover}`}
    >
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-[2px]">
        <span className="text-base font-bold text-foreground">{title}</span>
        <span className="text-[13px] text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

// ── Inline icons (stroke=currentColor where the parent sets colour) ──────────────────

function LockIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#a9781f"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M9 11V6a3 3 0 0 1 6 0v5" />
      <path d="M5 11h14l-1 9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--muted)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--clay-strong)"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand-strong)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#a9781f"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  );
}
