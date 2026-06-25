// log-categories.ts — the seven things a support worker logs during a shift.
//
// Defined in ONE place so the capture chips (client) and the server action that
// saves an entry (server) always agree on the exact list. If they drifted apart,
// the buttons could offer a category the server would then reject.
//
// This is a plain data module: no "use client" / "use server", so both sides can
// import it. Keep it free of anything server-only (no database, no cookies).

// A predefined amount the worker can pick instead of typing (e.g. "Can — 375 mL").
// `ml` is the value stored; `label` is what's shown in the dropdown / sheet.
export type AmountPreset = {
  label: string;
  ml: number;
};

// An optional numeric quantity a category can carry (e.g. fluids in mL). It's
// just a number with a unit; we store it as part of the entry's "detail" text.
// `presets` (optional) are common quick-pick amounts shown as a dropdown (web) or
// a slide-up sheet (mobile); "Custom" always lets the worker type an exact value.
export type LogAmount = {
  label: string; // shown above the input, e.g. "Amount"
  unit: string; // shown after the number, e.g. "mL"
  placeholder?: string; // example value to hint the field
  presets?: AmountPreset[];
};

// One loggable category. `key` is what we store in the database (must match the
// schema comment on LogEntry.category); `label` + `emoji` are just for display.
// `requireNote` (optional) means this category is meaningless without text — so
// the note box becomes required, enforced both in the UI and on the server.
// `details` (optional) are quick-pick chips for *structured* facts about the
// entry (e.g. Meal → "Most"); the worker can toggle several. `amount` (optional)
// adds a small number field (e.g. Fluids → mL). Details + amount are assembled
// into the entry's `detail` string — defined HERE so the chips, the server, and
// the timeline can never disagree on what's valid.
// A group of related quick-pick options within a category (the revamped model).
// e.g. Food has a "meal" group (single-select) and an "amount eaten" group.
// `key` is the form field the picks submit under; `mode` is single- or multi-select;
// `allowOther`/`learn` enable a free-text "Other" that the app can learn over time.
export type DetailGroup = {
  key: string;
  label: string; // the noun shown ("Select meal", sheet title, "Other meal")
  mode: "single" | "multi";
  options: string[];
  allowOther?: boolean;
  learn?: boolean;
  // Only show this group when another group's value is one of `in` (e.g. show the
  // Bristol scale only when the toilet type is Bowel or Both).
  showWhen?: { group: string; in: string[] };
};

export type LogCategory = {
  key: string;
  label: string;
  emoji: string;
  requireNote?: boolean;
  details?: string[];
  // The revamped categories use `groups` (one or more option groups) instead of
  // the flat `details` list. Categories not yet migrated still use `details`.
  groups?: DetailGroup[];
  amount?: LogAmount;
  // Simple free-text fields (e.g. a medication dose) appended to the entry detail.
  textFields?: { key: string; label: string; placeholder?: string }[];
  // Make the note required only when a group's value is one of `in` (e.g. require a
  // reason when a medication is PRN or Refused). Enforced in the UI and the server.
  requireNoteWhen?: { group: string; in: string[] };
  // Example/prompt text shown in the free-text note box, tailored to this category.
  notePlaceholder?: string;
};

// The order here is the order the chips appear on screen. Detail chips are kept
// factual on purpose: a worker may record what they observed ("Refused"), but we
// never offer feeling words — the AI must never infer a mood, and neither should
// a pre-set chip nudge one.
export const LOG_CATEGORIES: LogCategory[] = [
  {
    key: "Meal",
    label: "Food",
    emoji: "🍽️",
    notePlaceholder: "e.g. what they ate, appetite, any help needed",
    // Which meal (single) + how much was eaten (single).
    groups: [
      {
        key: "meal",
        label: "meal",
        mode: "single",
        options: ["Breakfast", "Lunch", "Dinner", "Snack", "Supper"],
      },
      {
        key: "eaten",
        label: "amount eaten",
        mode: "single",
        options: ["All", "Most", "About half", "A little", "None"],
      },
    ],
  },
  {
    key: "Fluids",
    label: "Drink",
    emoji: "💧",
    notePlaceholder: "e.g. encouraged fluids, sips vs full glass",
    // The drink type is a self-learning list (kind = the group key, "drink"): the
    // 4 base drinks seed it; typed "Other" drinks are spell-matched + learned.
    groups: [
      {
        key: "drink",
        label: "drink",
        mode: "single",
        options: ["Water", "Tea", "Coffee", "Juice"],
        allowOther: true,
        learn: true,
      },
    ],
    amount: {
      label: "Amount",
      unit: "mL",
      placeholder: "e.g. 250",
      // Care-common cups/glasses + standard Australian Coke sizes. Edit this one
      // list to change what appears in the dropdown (web) and the sheet (mobile).
      presets: [
        { label: "Sip", ml: 30 },
        { label: "Small glass", ml: 150 },
        { label: "Cup / glass", ml: 250 },
        { label: "Mug", ml: 350 },
        { label: "Can", ml: 375 },
        { label: "600 mL bottle", ml: 600 },
      ],
    },
  },
  {
    key: "Activity",
    label: "Activity",
    emoji: "🏃",
    notePlaceholder: "e.g. what they did, where, who was there",
    // Activity type is self-learning (kind "activity"); duration is a fixed list
    // with a free-text "Other" (e.g. "45 min") but is NOT learned.
    groups: [
      {
        key: "activity",
        label: "activity",
        mode: "single",
        options: [
          "Community access",
          "In-home",
          "Exercise",
          "Social",
          "Appointment",
          "Outing",
          "Shopping",
          "Rest",
        ],
        allowOther: true,
        learn: true,
      },
      {
        key: "duration",
        label: "duration",
        mode: "single",
        options: ["<5 min", "5 min", "10 min", "30 min", "1 hr"],
        allowOther: true,
      },
    ],
  },
  {
    key: "Sleep",
    label: "Sleep",
    emoji: "😴",
    notePlaceholder: "e.g. settled 10pm, brief wake at 2am, checked every 30 min",
    // State at this check (single) + optional overnight observations (multi). No
    // learning — sleep uses a fixed vocabulary. Common on SIL / overnight shifts.
    groups: [
      {
        key: "state",
        label: "state",
        mode: "single",
        options: ["Settled", "Asleep", "Awake", "Restless", "Up"],
      },
      {
        key: "obs",
        label: "observations",
        mode: "multi",
        options: [
          "Repositioned",
          "Continence check",
          "Settled with support",
          "Up to toilet",
          "Distressed – see note",
        ],
      },
    ],
  },
  {
    key: "Toileting",
    label: "Toilet",
    emoji: "🚻",
    notePlaceholder: "e.g. any pain, blood, or concerns",
    // Type (single) → Bristol scale only for Bowel/Both → observation toggles (multi).
    // Captures the bowel data (type + Bristol + timestamp) the future anti-impaction
    // plan needs. No learning — toileting is a fixed clinical vocabulary.
    groups: [
      { key: "type", label: "type", mode: "single", options: ["Urine", "Bowel", "Both"] },
      {
        key: "bristol",
        label: "Bristol stool type",
        mode: "single",
        options: [
          "Type 1 (hard lumps)",
          "Type 2 (lumpy)",
          "Type 3 (cracked)",
          "Type 4 (smooth, ideal)",
          "Type 5 (soft blobs)",
          "Type 6 (mushy)",
          "Type 7 (watery)",
        ],
        showWhen: { group: "type", in: ["Bowel", "Both"] },
      },
      {
        key: "obs",
        label: "observations",
        mode: "single",
        options: [
          "Independent",
          "Needed assistance",
          "Accident / incontinence",
          "Continence aid changed",
          "Catheter care",
          "Concern – see note",
        ],
      },
    ],
  },
  {
    key: "Hygiene",
    label: "Hygiene",
    emoji: "🧼",
    notePlaceholder: "e.g. how they managed, any skin concerns",
    // Tasks done (multi — a session is often several) + the assistance level (single).
    groups: [
      {
        key: "tasks",
        label: "tasks",
        mode: "multi",
        options: [
          "Shower",
          "Bath",
          "Wash",
          "Oral care",
          "Hair",
          "Shaving",
          "Nails",
          "Skin care",
          "Dressing",
        ],
      },
      {
        key: "assist",
        label: "assistance",
        mode: "single",
        options: ["Independent", "Prompted", "Assisted", "Full assistance"],
      },
    ],
  },
  {
    key: "Meds",
    label: "Medication",
    emoji: "💊",
    notePlaceholder: "e.g. reason if PRN or refused, any effects",
    // Status (single) + a free-text dose. PRN/Refused require a reason in the note.
    groups: [
      {
        key: "status",
        label: "status",
        mode: "single",
        options: ["Given", "Witnessed", "Self-administered", "PRN", "Refused", "Missed"],
      },
    ],
    textFields: [{ key: "dose", label: "Dose", placeholder: "e.g. 1 tablet, 5 mg" }],
    requireNoteWhen: { group: "status", in: ["PRN", "Refused"] },
  },
  // A free-text catch-all for anything the specific chips don't cover. The note
  // IS the entry, so it's required.
  { key: "Note", label: "Note", emoji: "📝", requireNote: true },
  {
    key: "Incident",
    label: "Incident",
    emoji: "⚠️",
    notePlaceholder: "e.g. what happened, who was involved, action taken",
  },
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

// Does this category require a written note? (e.g. a free-text "Note".)
// Used by both the chip UI and the server action, so the rule lives in one place.
export function categoryRequiresNote(key: string): boolean {
  return findCategory(key)?.requireNote === true;
}

// Keep only the detail chips that actually belong to this category. The browser
// sends whatever was ticked; the server passes it through here so a tampered or
// stale form can't store a detail we never offered. (Validate twice, trust once.)
export function validDetailsFor(key: string, selected: string[]): string[] {
  const allowed = findCategory(key)?.details ?? [];
  // Preserve the category's own order, and drop anything not offered/ticked.
  return allowed.filter((d) => selected.includes(d));
}

// Build the single `detail` string we store on the entry, from the ticked chips
// and (if any) the amount. Returns "" when there's nothing structured to record.
// Example: assembleDetail("Fluids", ["Water"], 250) -> "Water · 250 mL".
export function assembleDetail(
  key: string,
  selectedDetails: string[],
  amount?: number | null,
): string {
  const parts = validDetailsFor(key, selectedDetails);
  const cat = findCategory(key);
  if (cat?.amount && typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    parts.push(`${amount} ${cat.amount.unit}`);
  }
  return parts.join(" · ");
}
