// note-config.ts — the two TUNABLE parts of the progress-note prompt.
//
// These are deliberately pulled out of the prompt itself so they can become
// admin/manager-editable settings later (Phase 4: a settings screen writes
// overrides to the database; the note builder will prefer those and fall back to
// these defaults). For now they live here as clearly-labelled defaults — change
// the wording here and every future note obeys it, no other code changes.

// HOW MUCH to write. Length scales with the shift; the model is told not to pad.
export const DETAIL_LEVEL = `Match the length and depth to the shift itself: a short, simple shift gets a brief note; a long or complex shift gets a fuller, more detailed one. Cover every event and all support provided. As a rough guide an average shift runs about 250–350 words (a few solid paragraphs); go shorter or longer as the shift genuinely warrants. Do not pad to reach a length, and do not over-compress. Include the time an event occurred where it helps the reader, and a duration only when it can be derived from the log.`;

// WHO people are. Staff/stakeholders are written as "ROLE Name" (e.g. "DSW Sarah")
// using these abbreviations. CW/OM are this org's conventions; the rest are
// NDIS-sector standard. Managers can extend this list later via the settings screen.
export const GLOSSARY = `    DSW = Disability Support Worker     CW  = Case Worker
    OM  = Operations Manager            TL  = Team Leader
    SC  = Support Coordinator           LAC = Local Area Coordinator
    OT  = Occupational Therapist        PT  = Physiotherapist
    SP  = Speech Pathologist            Psych = Psychologist
    RN  = Registered Nurse              EN  = Enrolled Nurse
    GP  = General Practitioner          BSP = Behaviour Support Practitioner
    AHA = Allied Health Assistant       PM  = Plan Manager
    NOK = Next of Kin                   POA = Power of Attorney
    PG  = Public Guardian               EC  = Emergency Contact`;
