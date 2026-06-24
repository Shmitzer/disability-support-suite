// category-colors.ts — one colour per category, used by BOTH the "Log something"
// chips and the timeline (dot + entry highlight), so they stay consistent.
//
// Caira "Paper" palette: each category is a soft cut-paper FILL tint with a darker
// stroked-glyph INK, taken from the HANDOFF spec. Tailwind can only see complete
// class strings, so each variant is written out in full (arbitrary [#hex] values).
//   chipIdle  — the capture tile at rest
//   chipActive— the chosen-category chip in the compact header
//   dot       — the coloured timeline dot
//   card      — the light highlight on a timeline entry card

type CatColor = { chipIdle: string; chipActive: string; dot: string; card: string };

const COLORS: Record<string, CatColor> = {
  // Food — fill #f6d99a / ink #8a5a18
  Meal: {
    chipIdle: "border-[#8a5a18]/20 bg-[#f6d99a] text-[#8a5a18] hover:brightness-95",
    chipActive: "border-[#8a5a18]/50 bg-[#f6d99a] text-[#8a5a18]",
    dot: "border-[#8a5a18]/30 bg-[#f6d99a] text-[#8a5a18]",
    card: "border-[#8a5a18]/15 bg-[#f6d99a]/50",
  },
  // Drink — fill #a9ddd7 / ink #0e5e58
  Fluids: {
    chipIdle: "border-[#0e5e58]/20 bg-[#a9ddd7] text-[#0e5e58] hover:brightness-95",
    chipActive: "border-[#0e5e58]/50 bg-[#a9ddd7] text-[#0e5e58]",
    dot: "border-[#0e5e58]/30 bg-[#a9ddd7] text-[#0e5e58]",
    card: "border-[#0e5e58]/15 bg-[#a9ddd7]/50",
  },
  // Activity — fill #aedcb6 / ink #256b3f
  Activity: {
    chipIdle: "border-[#256b3f]/20 bg-[#aedcb6] text-[#256b3f] hover:brightness-95",
    chipActive: "border-[#256b3f]/50 bg-[#aedcb6] text-[#256b3f]",
    dot: "border-[#256b3f]/30 bg-[#aedcb6] text-[#256b3f]",
    card: "border-[#256b3f]/15 bg-[#aedcb6]/50",
  },
  // Toilet — fill #b9e0da / ink #14756a
  Toileting: {
    chipIdle: "border-[#14756a]/20 bg-[#b9e0da] text-[#14756a] hover:brightness-95",
    chipActive: "border-[#14756a]/50 bg-[#b9e0da] text-[#14756a]",
    dot: "border-[#14756a]/30 bg-[#b9e0da] text-[#14756a]",
    card: "border-[#14756a]/15 bg-[#b9e0da]/50",
  },
  // Hygiene — fill #cdd6f0 / ink #4d5b9e
  Hygiene: {
    chipIdle: "border-[#4d5b9e]/20 bg-[#cdd6f0] text-[#4d5b9e] hover:brightness-95",
    chipActive: "border-[#4d5b9e]/50 bg-[#cdd6f0] text-[#4d5b9e]",
    dot: "border-[#4d5b9e]/30 bg-[#cdd6f0] text-[#4d5b9e]",
    card: "border-[#4d5b9e]/15 bg-[#cdd6f0]/50",
  },
  // Medication — fill #f3c2d8 / ink #962f63
  Meds: {
    chipIdle: "border-[#962f63]/20 bg-[#f3c2d8] text-[#962f63] hover:brightness-95",
    chipActive: "border-[#962f63]/50 bg-[#f3c2d8] text-[#962f63]",
    dot: "border-[#962f63]/30 bg-[#f3c2d8] text-[#962f63]",
    card: "border-[#962f63]/15 bg-[#f3c2d8]/50",
  },
  // Note — warm neutral paper (no spec tint; derived from ink/line)
  Note: {
    chipIdle: "border-[#7a6a55]/20 bg-[#efe6d6] text-[#7a6a55] hover:brightness-95",
    chipActive: "border-[#7a6a55]/50 bg-[#efe6d6] text-[#7a6a55]",
    dot: "border-[#7a6a55]/30 bg-[#efe6d6] text-[#7a6a55]",
    card: "border-[#7a6a55]/15 bg-[#efe6d6]/50",
  },
  // Incident — soft clay warning (calm, not alarmist — accessibility intent)
  Incident: {
    chipIdle: "border-[#b0402b]/25 bg-[#f7d8cd] text-[#b0402b] hover:brightness-95",
    chipActive: "border-[#b0402b]/55 bg-[#f7d8cd] text-[#b0402b]",
    dot: "border-[#b0402b]/30 bg-[#f7d8cd] text-[#b0402b]",
    card: "border-[#b0402b]/15 bg-[#f7d8cd]/50",
  },
};

const DEFAULT: CatColor = {
  chipIdle: "border-[#8a7a66]/20 bg-[#efe6d6] text-[#7a6a55] hover:brightness-95",
  chipActive: "border-[#8a7a66]/50 bg-[#efe6d6] text-[#7a6a55]",
  dot: "border-[#8a7a66]/30 bg-[#efe6d6] text-[#7a6a55]",
  card: "border-[#8a7a66]/15 bg-[#efe6d6]/50",
};

export function catColor(key: string): CatColor {
  return COLORS[key] ?? DEFAULT;
}
