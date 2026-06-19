// category-colors.ts — one colour per category, used by BOTH the "Log something"
// chips and the timeline (dot + entry highlight), so they stay consistent.
//
// Tailwind can only see complete class strings, so each variant is written out in
// full here rather than glued together. Keyed by the stored category key.
//   chipIdle  — the capture chip at rest
//   chipActive— the chosen-category chip in the compact header
//   dot       — the coloured timeline dot
//   card      — the light highlight on a timeline entry card

type CatColor = { chipIdle: string; chipActive: string; dot: string; card: string };

const COLORS: Record<string, CatColor> = {
  Meal: {
    chipIdle: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    chipActive: "border-amber-400 bg-amber-100 text-amber-900",
    dot: "border-amber-300 bg-amber-100 text-amber-800",
    card: "border-amber-200 bg-amber-50",
  },
  Fluids: {
    chipIdle: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    chipActive: "border-sky-400 bg-sky-100 text-sky-900",
    dot: "border-sky-300 bg-sky-100 text-sky-800",
    card: "border-sky-200 bg-sky-50",
  },
  Activity: {
    chipIdle: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
    chipActive: "border-green-400 bg-green-100 text-green-900",
    dot: "border-green-300 bg-green-100 text-green-800",
    card: "border-green-200 bg-green-50",
  },
  Toileting: {
    chipIdle: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100",
    chipActive: "border-teal-400 bg-teal-100 text-teal-900",
    dot: "border-teal-300 bg-teal-100 text-teal-800",
    card: "border-teal-200 bg-teal-50",
  },
  Hygiene: {
    chipIdle: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100",
    chipActive: "border-purple-400 bg-purple-100 text-purple-900",
    dot: "border-purple-300 bg-purple-100 text-purple-800",
    card: "border-purple-200 bg-purple-50",
  },
  Meds: {
    chipIdle: "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100",
    chipActive: "border-pink-400 bg-pink-100 text-pink-900",
    dot: "border-pink-300 bg-pink-100 text-pink-800",
    card: "border-pink-200 bg-pink-50",
  },
  Note: {
    chipIdle: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
    chipActive: "border-slate-400 bg-slate-100 text-slate-800",
    dot: "border-slate-300 bg-slate-100 text-slate-700",
    card: "border-slate-200 bg-slate-50",
  },
  Incident: {
    chipIdle: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
    chipActive: "border-red-400 bg-red-100 text-red-900",
    dot: "border-red-300 bg-red-100 text-red-800",
    card: "border-red-200 bg-red-50",
  },
};

const DEFAULT: CatColor = {
  chipIdle: "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
  chipActive: "border-zinc-400 bg-zinc-100 text-zinc-800",
  dot: "border-zinc-200 bg-zinc-100 text-zinc-600",
  card: "border-zinc-200 bg-white",
};

export function catColor(key: string): CatColor {
  return COLORS[key] ?? DEFAULT;
}
