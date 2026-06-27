// notices.ts — LOGIC ONLY for the in-page legal/operational disclaimers
// (pre-launch-doc-checklist.md item 7). This module decides WHICH notices apply in a
// given context; it does NOT contain final user-facing copy and renders nothing.
//   • Final wording → product/legal.  • Placement/markup → cd (design).
//   • This file → CC: the flags/conditions that surface each notice.
//
// Pure (no React, no DB) so it's importable anywhere and unit-tested. Components ask
// activeNotices(ctx) and render the returned keys however the design dictates.

// The notice keys (stable identifiers; map each to copy in the UI layer).
export const Notice = {
  AiReview: "ai_review", // AI-assisted output — review/confirm before saving; no clinical decisions
  NoteApprovalAttestation: "note_approval_attestation", // approver confirms it reflects support given
  IncidentMandatory: "incident_mandatory", // incident → mandatory NDIS fields + reportable timeline
  RestrictivePracticeReporting: "restrictive_practice_reporting", // RP use may require reporting per BSP
  FamilySubmitCaveat: "family_submit_caveat", // family/guardian update is flagged, not clinical direction
  ExportDeidentify: "export_deidentify", // de-identify before sharing externally
  CapturePrivacy: "capture_privacy", // factual-only; scrubbed before any AI step
  LoginPrivacy: "login_privacy", // privacy-notice link + consent checkpoint
} as const;
export type Notice = (typeof Notice)[keyof typeof Notice];

// Developer-facing intent for each notice (NOT final UI copy — for cd/product to author).
export const NOTICE_INTENT: Record<Notice, string> = {
  [Notice.AiReview]: "AI-assisted output must be reviewed and confirmed before saving; Caira makes no clinical decisions.",
  [Notice.NoteApprovalAttestation]: "Approver attests the note reflects the support actually provided.",
  [Notice.IncidentMandatory]: "Incident requires the mandatory NDIS fields and points to the reportable-incident timeline.",
  [Notice.RestrictivePracticeReporting]: "Recorded restrictive-practice use may require reporting per the participant's behaviour support plan.",
  [Notice.FamilySubmitCaveat]: "A family/guardian update is flagged to provider staff and does not replace clinical direction.",
  [Notice.ExportDeidentify]: "De-identify where required before sharing an export externally.",
  [Notice.CapturePrivacy]: "Keep entries factual; details are scrubbed before any AI step.",
  [Notice.LoginPrivacy]: "Privacy-notice link and consent checkpoint at sign-in / first run.",
};

// The surface/action a screen represents (what the user is doing right now).
export type NoticeSurface =
  | "capture" // tapping a chip to log an entry
  | "aiGenerate" // generating a progress note from a shift
  | "noteReview" // reviewing AI-extracted draft entries before commit
  | "noteApproval" // a supervisor approving a note
  | "familySubmit" // family/guardian submitting a med/routine update
  | "export" // exporting/PDF
  | "login"; // login / first-run

// Context the resolver reasons over. `category`/`groups` mirror the capture model
// (log-categories.ts) so we can key on the real chips without importing UI.
export type NoticeContext = {
  surface: NoticeSurface;
  category?: string; // e.g. "Incident", "Behaviour"
  groups?: Record<string, string[]>; // picked option groups, e.g. { restrictive: [...] }
};

function hasAny(groups: Record<string, string[]> | undefined, key: string): boolean {
  return (groups?.[key] ?? []).length > 0;
}

// Which notices apply for this context (deduped, stable order). Pure + total.
export function activeNotices(ctx: NoticeContext): Notice[] {
  const out = new Set<Notice>();
  switch (ctx.surface) {
    case "capture":
      out.add(Notice.CapturePrivacy);
      if (ctx.category === "Incident") out.add(Notice.IncidentMandatory);
      // Behaviour entry with a restrictive practice selected (group key "restrictive").
      if (ctx.category === "Behaviour" && hasAny(ctx.groups, "restrictive")) {
        out.add(Notice.RestrictivePracticeReporting);
      }
      break;
    case "aiGenerate":
    case "noteReview":
      out.add(Notice.AiReview);
      break;
    case "noteApproval":
      out.add(Notice.NoteApprovalAttestation);
      break;
    case "familySubmit":
      out.add(Notice.FamilySubmitCaveat);
      break;
    case "export":
      out.add(Notice.ExportDeidentify);
      break;
    case "login":
      out.add(Notice.LoginPrivacy);
      break;
  }
  return [...out];
}

// Convenience boolean for a single notice in a context.
export function shouldShow(notice: Notice, ctx: NoticeContext): boolean {
  return activeNotices(ctx).includes(notice);
}
