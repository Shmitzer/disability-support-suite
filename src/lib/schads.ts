// schads.ts — SCHADS Award (MA000100) pay interpretation CORE (Phase 2.5,
// enterprise depth). PURE + unit-tested. Money is integer cents; base rate is
// passed in as cents/hour.
//
// IMPORTANT — this is a rules ENGINE, not a legal authority. It encodes the
// STRUCTURE of award interpretation (day-of-week penalties, evening/night shift
// loadings, overtime splits, casual-loading interaction, flat allowances). The
// actual MULTIPLIERS + allowance amounts live in a swappable SchadsConfig because
// they change every Fair Work annual wage review (most recently +3.5% from
// 2025-07-01) and differ by stream. DEFAULT_SCHADS_CONFIG holds best-known values
// but MUST be verified against the current MA000100 pay guide before it drives real
// payroll — treat it like the NDIA price guide: Edward-supplied/verified reference
// data, not gospel baked into code.

export type EmploymentType = "full_time" | "part_time" | "casual";

// The dominant day classification for a shift. Award penalties are "higher of" —
// a public holiday beats Sunday beats Saturday beats a weekday.
export type DayType = "weekday" | "saturday" | "sunday" | "public_holiday";

// When the casual 25% loading is "added" to a penalty (the SCHADS approach: casual
// Saturday = 150% + 25% = 175%) vs "compounded" (1.50 × 1.25). SCHADS uses "added".
export type CasualMode = "added" | "compounded";

export type SchadsConfig = {
  version: string; // e.g. "MA000100 2025-07" — which pay-guide release these came from
  casualLoading: number; // e.g. 0.25
  casualMode: CasualMode;
  // Permanent (full/part-time) day multipliers, as multiples of the base rate.
  day: Record<DayType, number>;
  // Shift loadings for shiftworkers, as multiples of the base rate (whole shift).
  // Applied to ORDINARY (non-overtime, non-weekend/PH) hours only.
  eveningShift: number; // shift finishing after 8pm, at/before midnight
  nightShift: number; // shift finishing after midnight / commencing before 6am
  // Overtime, as multiples of the base rate.
  overtimeFirst: number; // first `overtimeFirstHours` of OT
  overtimeAfter: number; // OT beyond that
  overtimeFirstHours: number; // usually 2
  ordinaryHoursPerDay: number; // daily span before OT kicks in (usually ~ rostered)
  // Flat allowances in cents.
  sleepoverCents: number; // per sleepover
  brokenShiftCents: number; // per broken shift (1 break)
};

// ⚠️ VERIFY against the current MA000100 pay guide before real payroll use.
// Structure is the load-bearing part; these numbers are the reviewable knobs.
export const DEFAULT_SCHADS_CONFIG: SchadsConfig = {
  version: "MA000100 (UNVERIFIED defaults — confirm against Fair Work pay guide)",
  casualLoading: 0.25,
  casualMode: "added",
  day: {
    weekday: 1.0,
    saturday: 1.5,
    sunday: 1.75,
    public_holiday: 2.5,
  },
  eveningShift: 1.125, // +12.5%
  nightShift: 1.15, // +15%
  overtimeFirst: 1.5,
  overtimeAfter: 2.0,
  overtimeFirstHours: 2,
  ordinaryHoursPerDay: 7.6, // 38/5; the rostered ordinary span varies — config it
  sleepoverCents: 0,
  brokenShiftCents: 0,
};

// Resolve the multiplier for ordinary (non-overtime) hours given the day and
// employment type. Casual loading is added to (or compounded with) the permanent
// day penalty per the config's CasualMode.
export function ordinaryMultiplier(
  dayType: DayType,
  employment: EmploymentType,
  config: SchadsConfig = DEFAULT_SCHADS_CONFIG,
): number {
  const base = config.day[dayType];
  if (employment !== "casual") return base;
  return config.casualMode === "added" ? base + config.casualLoading : base * (1 + config.casualLoading);
}

// Split a shift's hours into ordinary / first-OT / after-OT buckets, given how many
// ordinary hours the worker has ALREADY worked that day (so a second shift can push
// straight into overtime). Overtime is daily here; weekly OT (>38) is a higher-level
// concern the caller aggregates.
export type HourSplit = { ordinary: number; overtimeFirst: number; overtimeAfter: number };

export function splitOvertime(
  shiftHours: number,
  ordinaryHoursAlready: number,
  config: SchadsConfig = DEFAULT_SCHADS_CONFIG,
): HourSplit {
  const h = Math.max(0, shiftHours);
  const remainingOrdinary = Math.max(0, config.ordinaryHoursPerDay - Math.max(0, ordinaryHoursAlready));
  const ordinary = Math.min(h, remainingOrdinary);
  const otTotal = h - ordinary;
  const overtimeFirst = Math.min(otTotal, config.overtimeFirstHours);
  const overtimeAfter = otTotal - overtimeFirst;
  return { ordinary, overtimeFirst, overtimeAfter };
}

export type ShiftPayInput = {
  baseRateCents: number; // ordinary base hourly rate, in cents
  hours: number; // total paid hours in this shift
  dayType: DayType;
  employment: EmploymentType;
  ordinaryHoursAlready?: number; // ordinary hours already worked today (default 0)
  shiftLoading?: "none" | "evening" | "night"; // shiftworker loading on ordinary hrs
  sleepovers?: number; // count of sleepovers attached to this shift
  brokenShift?: boolean; // a broken (split) shift attracts the allowance
};

export type ShiftPayResult = {
  ordinaryCents: number;
  overtimeCents: number;
  allowancesCents: number;
  totalCents: number;
  breakdown: {
    split: HourSplit;
    ordinaryMultiplier: number;
    appliedShiftLoading: number; // 1.0 when none/overridden by weekend/PH
  };
};

const round = (n: number) => Math.round(n);

// Compute gross pay for a single shift. Rules encoded:
//  • Ordinary hours pay at the day multiplier (weekday/Sat/Sun/PH), with the casual
//    loading folded in per config.
//  • Evening/night SHIFT loadings apply to ordinary hours ONLY on a plain weekday
//    (weekend/PH penalties already exceed them — "higher of", so we don't stack).
//  • Overtime hours pay at the OT multipliers (which already exceed ordinary day
//    penalties); casual loading is added to OT too when casualMode === "added".
//  • Sleepover + broken-shift allowances are flat per-occurrence adds.
export function payForShift(
  input: ShiftPayInput,
  config: SchadsConfig = DEFAULT_SCHADS_CONFIG,
): ShiftPayResult {
  const split = splitOvertime(input.hours, input.ordinaryHoursAlready ?? 0, config);
  const dayMult = ordinaryMultiplier(input.dayType, input.employment, config);

  // Shift loading only bites on a plain weekday (otherwise the weekend/PH multiplier
  // is higher and the award takes the higher single penalty, not both).
  let appliedShiftLoading = 1.0;
  if (input.dayType === "weekday" && input.shiftLoading && input.shiftLoading !== "none") {
    appliedShiftLoading = input.shiftLoading === "night" ? config.nightShift : config.eveningShift;
  }
  const ordinaryRate = input.baseRateCents * Math.max(dayMult, appliedShiftLoading > 1 ? appliedShiftLoading : dayMult);
  // On weekdays with a shift loading, ordinary rate = base × shiftLoading (which is
  // ≥ weekday 1.0); on weekend/PH it's base × dayMult. Math.max above realises that.

  const casualAdd = input.employment === "casual" && config.casualMode === "added" ? config.casualLoading : 0;
  const otFirstRate = input.baseRateCents * (config.overtimeFirst + casualAdd);
  const otAfterRate = input.baseRateCents * (config.overtimeAfter + casualAdd);

  const ordinaryCents = round(split.ordinary * ordinaryRate);
  const overtimeCents = round(split.overtimeFirst * otFirstRate + split.overtimeAfter * otAfterRate);
  const allowancesCents =
    (input.sleepovers ?? 0) * config.sleepoverCents + (input.brokenShift ? config.brokenShiftCents : 0);

  return {
    ordinaryCents,
    overtimeCents,
    allowancesCents,
    totalCents: ordinaryCents + overtimeCents + allowancesCents,
    breakdown: { split, ordinaryMultiplier: dayMult, appliedShiftLoading },
  };
}

// Classify a date's DayType. publicHoliday is supplied by the caller (it depends on
// the worker's state + the year's gazetted holidays — out of scope for this core).
// `dayOfWeek`: 0=Sun … 6=Sat (JS getUTCDay convention).
export function classifyDay(dayOfWeek: number, isPublicHoliday: boolean): DayType {
  if (isPublicHoliday) return "public_holiday";
  if (dayOfWeek === 0) return "sunday";
  if (dayOfWeek === 6) return "saturday";
  return "weekday";
}
