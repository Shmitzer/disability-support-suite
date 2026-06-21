// sector-config.ts — sector-specific USER-FACING terminology (Rule 4: no hardcoded
// sector terms in JSX). One label map per SectorMode; the UI reads labels from here
// so the app can be re-skinned for aged care, mental health, etc. without touching
// components.
//
// This module is PURE (no DB / no async) so it is safe to import in client
// components. Server code resolves the current sector via getCurrentSector()
// (src/lib/session.ts) and either uses sectorLabels() directly or passes the
// SectorMode down to client children, which call sectorLabels() themselves.

import { SectorMode } from "@/lib/enums";

export type SectorLabels = {
  participant: string; // singular, lowercase — e.g. "participant"
  participantPlural: string; // e.g. "participants"
  participantTitle: string; // capitalised singular for form labels / headings
  noteStyle: string; // adjective before "progress note" — e.g. "NDIS-style"
  tagline: string; // app tagline / metadata description
};

const LABELS: Record<SectorMode, SectorLabels> = {
  [SectorMode.NDIS]: {
    participant: "participant",
    participantPlural: "participants",
    participantTitle: "Participant",
    noteStyle: "NDIS-style",
    tagline: "NDIS support-worker tools",
  },
  [SectorMode.AGED_CARE]: {
    participant: "client",
    participantPlural: "clients",
    participantTitle: "Client",
    noteStyle: "aged-care",
    tagline: "Aged-care support tools",
  },
  [SectorMode.MENTAL_HEALTH]: {
    participant: "consumer",
    participantPlural: "consumers",
    participantTitle: "Consumer",
    noteStyle: "mental-health",
    tagline: "Mental-health support tools",
  },
  [SectorMode.COMMUNITY_SERVICES]: {
    participant: "client",
    participantPlural: "clients",
    participantTitle: "Client",
    noteStyle: "community-services",
    tagline: "Community-services support tools",
  },
  [SectorMode.EARLY_CHILDHOOD]: {
    participant: "child",
    participantPlural: "children",
    participantTitle: "Child",
    noteStyle: "early-childhood",
    tagline: "Early-childhood support tools",
  },
};

// Resolve the label map for a sector. Unknown / missing → NDIS (the default tenant
// sector), so callers can pass a raw string straight from the database.
export function sectorLabels(sector?: string | null): SectorLabels {
  return LABELS[sector as SectorMode] ?? LABELS[SectorMode.NDIS];
}
