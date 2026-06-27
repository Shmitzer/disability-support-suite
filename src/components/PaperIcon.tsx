// PaperIcon.tsx — Caira "Paper" category icons: a soft cut-paper blob fill + a
// stroked line glyph, reproduced exactly from the design source of truth
// (docs/design/Caira Tracker.dc.html → paperIcon()). Render <PaperDefs/> ONCE on
// any screen that uses these (it defines the shared drop-shadow filter), then
// <PaperIcon category={LogCategory.key} size={46} />.

import type { CSSProperties } from "react";

// Soft drop shadow the paper blobs use. Must be in the DOM once per screen.
export function PaperDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="paperSh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#7a5a36" floodOpacity="0.22" />
        </filter>
      </defs>
    </svg>
  );
}

// The three blob outlines (rotated paper cut-outs) the design rotates between.
const BLOB = {
  A: "M28 5C40 5 51 11 50 26C49 40 45 51 27 51C12 51 6 40 7 26C8 13 16 5 28 5Z",
  B: "M27 5C41 4 52 12 50 27C49 41 43 52 26 51C12 50 5 41 7 25C9 12 17 6 27 5Z",
  C: "M28 4C41 5 51 12 51 27C51 41 44 52 27 51C13 50 5 40 6 26C7 12 17 4 28 4Z",
};

// Keyed by the repo's LogCategory.key. Only the six tile categories have a Paper
// icon (Note → free-text/voice; Incident → its own button), matching the design.
const ICONS: Record<string, { blob: string; fill: string; stroke: string; glyph: string }> = {
  Meal:      { blob: BLOB.A, fill: "#f6d99a", stroke: "#8a5a18", glyph: '<path d="M6 3v7a2 2 0 0 0 4 0V3"></path><path d="M8 10v11"></path><path d="M16 3c-1.5 1-2 3-2 5s.5 3 2 3v10"></path>' },
  Fluids:    { blob: BLOB.B, fill: "#a9ddd7", stroke: "#0e5e58", glyph: '<path d="M6 4h12l-1.1 14.2a2 2 0 0 1-2 1.8H9.1a2 2 0 0 1-2-1.8L6 4z"></path><path d="M6.4 9h11.2"></path>' },
  Hygiene:   { blob: BLOB.A, fill: "#cdd6f0", stroke: "#4d5b9e", glyph: '<path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z"></path>' },
  Activity:  { blob: BLOB.C, fill: "#aedcb6", stroke: "#256b3f", glyph: '<circle cx="13" cy="4.5" r="1.5"></circle><path d="M12 9l-2.5 4 3 2.5L11 21"></path><path d="M12 9l3.5 1.5L18 9"></path><path d="M12 9l-4 1"></path>' },
  Toileting: { blob: BLOB.B, fill: "#b9e0da", stroke: "#14756a", glyph: '<path d="M6 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"></path><path d="M9 17v3"></path><path d="M15 17v3"></path>' },
  Meds:      { blob: BLOB.A, fill: "#f3c2d8", stroke: "#962f63", glyph: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"></rect><line x1="9" y1="9" x2="15" y2="15"></line>' },
  Sleep:     { blob: BLOB.C, fill: "#d7d0ec", stroke: "#5b4d8a", glyph: '<path d="M18 13.5A7.5 7.5 0 1 1 9 4.2 6 6 0 0 0 18 13.5Z"></path>' },
  Behaviour:    { blob: BLOB.A, fill: "#e8d3bf", stroke: "#8f5b39", glyph: '<path d="M4 5h16v10H8l-4 4V5z"></path><circle cx="9" cy="10" r="0.6"></circle><circle cx="12" cy="10" r="0.6"></circle><circle cx="15" cy="10" r="0.6"></circle>' },
  Seizure:      { blob: BLOB.B, fill: "#f5d59a", stroke: "#9a6a1f", glyph: '<path d="M13 2 5 13h6l-2 9 10-13h-7z"></path>' },
  Repositioning:{ blob: BLOB.C, fill: "#cdd9e0", stroke: "#3f5b6b", glyph: '<path d="M4 12a8 8 0 0 1 14-5"></path><path d="M18 3v4h-4"></path><path d="M20 12a8 8 0 0 1-14 5"></path><path d="M6 21v-4h4"></path>' },
};

export function hasPaperIcon(category: string): boolean {
  return category in ICONS;
}

export function PaperIcon({ category, size = 46 }: { category: string; size?: number }) {
  const d = ICONS[category];
  if (!d) return null;
  const style: CSSProperties = { overflow: "visible" };
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={style} aria-hidden>
      <path d={d.blob} fill={d.fill} filter="url(#paperSh)" />
      <g
        transform="translate(16,16)"
        fill="none"
        stroke={d.stroke}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: d.glyph }}
      />
    </svg>
  );
}
