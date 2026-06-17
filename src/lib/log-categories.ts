// log-categories.ts — the seven things a support worker logs during a shift.
//
// Defined in ONE place so the capture chips (client) and the server action that
// saves an entry (server) always agree on the exact list. If they drifted apart,
// the buttons could offer a category the server would then reject.
//
// This is a plain data module: no "use client" / "use server", so both sides can
// import it. Keep it free of anything server-only (no database, no cookies).

// One loggable category. `key` is what we store in the database (must match the
// schema comment on LogEntry.category); `label` + `emoji` are just for display.
export type LogCategory = {
  key: string;
  label: string;
  emoji: string;
};

// The order here is the order the chips appear on screen.
export const LOG_CATEGORIES: LogCategory[] = [
  { key: "Meal", label: "Meal", emoji: "🍽️" },
  { key: "Fluids", label: "Fluids", emoji: "💧" },
  { key: "Activity", label: "Activity", emoji: "🏃" },
  { key: "Toileting", label: "Toileting", emoji: "🚻" },
  { key: "Hygiene", label: "Hygiene", emoji: "🧼" },
  { key: "Meds", label: "Meds", emoji: "💊" },
  { key: "Incident", label: "Incident", emoji: "⚠️" },
];

// Quick lookup for the server: "is this a category we actually offer?"
const KEYS = new Set(LOG_CATEGORIES.map((c) => c.key));
export function isLogCategory(value: string): boolean {
  return KEYS.has(value);
}

// Find a category by key (for showing its emoji/label on the timeline).
export function findCategory(key: string): LogCategory | undefined {
  return LOG_CATEGORIES.find((c) => c.key === key);
}
