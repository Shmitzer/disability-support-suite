// shift-time.ts — pure helpers for reasoning about whether a log entry's time sits
// inside the shift window. Used to WARN (not block) when a back-logged or model-
// estimated time falls outside clock-on → now, so the worker can confirm it's right.
//
// Pure + testable; no DB, no React. Times are compared as minutes-of-day so the same
// helper works on the "HH:MM" strings the pickers produce. The window wraps across
// midnight (overnight shifts): when end < start, "inside" means after start OR before
// end.

// "HH:MM" (24h) → minutes since midnight, or null if malformed.
export function minutesOfDay(hhmm: string | undefined | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

// Is `t` within [start, end] (minutes-of-day), handling an overnight wrap?
export function isWithinWindow(t: number, start: number, end: number): boolean {
  if (start <= end) return t >= start && t <= end;
  return t >= start || t <= end; // window crosses midnight
}

export type TimeWarning = "before_start" | "after_end" | null;

// Classify an "HH:MM" against the shift window. Returns null when it's inside (or when
// inputs are unusable, so a bad value never produces a false warning).
export function timeWindowWarning(
  timeHHMM: string,
  startHHMM: string | null,
  endHHMM: string | null,
): TimeWarning {
  const t = minutesOfDay(timeHHMM);
  const start = minutesOfDay(startHHMM);
  const end = minutesOfDay(endHHMM);
  if (t == null || start == null || end == null) return null;
  if (isWithinWindow(t, start, end)) return null;
  // Outside the window — which side is it closer to? For a non-wrapping window this is
  // simply before-start vs after-end; for a wrapping one, anything outside is "after".
  if (start <= end) return t < start ? "before_start" : "after_end";
  return "after_end";
}
