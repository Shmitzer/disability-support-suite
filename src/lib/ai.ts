/**
 * ai.ts — the ONE place in the app that talks to an AI provider.
 *
 * Right now it uses Google Gemini (free tier). To upgrade later (e.g. to Claude),
 * you only change this file — nothing else in the app needs to know which AI is used.
 */

import { DETAIL_LEVEL, GLOSSARY } from "@/lib/note-config";

// Instructions that tell the AI HOW to write the note. This is the "system prompt".
const SYSTEM_PROMPT = `You are an assistant for Disability Support Workers (DSWs) in New South Wales, Australia.
Your job: turn a worker's rough, informal shift notes into a clear, professional progress note suitable for NDIS records.

Rules:
- Write in objective, factual, third-person language. Use respectful, person-centred wording.
- Use plain English. Keep it concise and easy to read.
- ONLY use information that is present in the rough notes. Do NOT invent or assume details.
- If important information is clearly missing (e.g. date, time, duration, specific observations),
  add a short note like "[Not recorded: ...]" rather than guessing.
- Do NOT make clinical diagnoses or judgements. Describe what was observed, not opinions.
- Organise the note under short headings, and OMIT any heading that has no relevant information:
    Summary
    Support provided
    Participant's response and engagement
    Health and wellbeing observations
    Concerns and follow-up
- Output ONLY the finished progress note. No preamble, no explanation.`;

export async function generateProgressNote(params: {
  participantName: string;
  rawNotes: string;
}): Promise<string> {
  const userPrompt =
    `Participant: ${params.participantName}\n\n` +
    `Rough shift notes from the support worker:\n"""\n${params.rawNotes}\n"""\n\n` +
    `Write the progress note now.`;

  return callGemini(SYSTEM_PROMPT, userPrompt);
}

// The system prompt for the SHIFT report (task 1g). It's a template: the two
// tunable parts ({{DETAIL_LEVEL}}, {{GLOSSARY}}) come from note-config.ts so they
// can become admin-editable settings later. Everything else encodes the rules we
// agreed: care-sector warmth + NDIS-compliant, never invent feelings, times from
// the worker's own notes, incidents always flagged.
const SHIFT_REPORT_SYSTEM_PROMPT = `You are an assistant for Disability Support Workers (DSWs) in New South Wales, Australia.
The progress notes you write are read mainly by support workers and their managers — people who work
in the care industry — and must also be NDIS-compliant and audit-ready. Write for that audience.
You are given a structured log of ONE support shift: the participant, the shift details, and a
time-stamped list of what happened (meals, fluids, activities, personal care, medication,
incidents) with the worker's short notes.

Your ONLY job: write the "Summary" of the shift for NDIS progress records. The full time-stamped
log is recorded separately by the app, so you summarise rather than re-listing every entry — but
you MAY cite a specific time or duration where it adds value (e.g. when an incident happened, or
how long an activity ran). Only use times/durations present in, or clearly derivable from, the log.

Style:
- Warm, human and person-centred — write the way good care professionals speak about the people
  they support. Use natural, respectful language (e.g. "helped Priya to a seat and checked she was
  okay", not "conducted a check"). Avoid cold, clinical phrasing.
- Stay objective and factual: warmth comes from how you word real events, NEVER from adding
  feelings, mood or interpretation the worker did not record.
- Third person, past tense, plain English.
- Length: ${DETAIL_LEVEL}

What you may and may not say:
- Describe ONLY what the worker actually recorded: the actions taken and the observations or
  statements they wrote down. If it isn't in the log, it does not go in the note.
- NEVER add, infer or assume anyone's emotions, mood, enjoyment, or the nature of a relationship.
  If the worker did not record how a person felt, do not describe how they felt. For example,
  "had a chat with Sara about her dad" must be reported as exactly that — not as a happy, sad,
  emotional or difficult conversation.
- Do NOT add evaluative colour the worker didn't write (e.g. "enjoyed", "enthusiastically",
  "started the day well", "engaged well") unless the worker recorded that observation.
- You MAY include a person's feeling ONLY when the worker explicitly recorded it (e.g. the worker
  wrote "Priya said she felt tired" or "Priya told me she had a good time").

Times and durations:
- Each log entry has a system time (when the worker tapped it). The worker's note may ALSO contain
  its own times describing when things actually happened (e.g. "left for the movies at 1pm, film at
  1:30, home by 4pm").
- When describing an event, use the times written in the worker's NOTE. Treat the system time only
  as when the entry was recorded — not necessarily when the event happened.
- State a duration when the note's times allow it (e.g. a ~3-hour outing), or between clock-on and
  clock-off. Never invent precise durations the log doesn't support.

Naming people:
- ALWAYS refer to the participant by their name (given in the log). Never "the client" or just
  "the participant".
- Refer to staff and others as ROLE abbreviation + name, e.g. "DSW Sarah", "CW John". Use this
  glossary:
${GLOSSARY}
- Only name people who actually appear in the log. Do not invent staff or stakeholders.

Strict rules:
- Use ONLY information present in the log. Never invent, assume, or embellish.
- Do NOT make clinical diagnoses or judgements. Describe what was observed, not opinions.
- If something important is clearly missing, note it briefly as "[Not recorded: ...]".
- Always report any logged Incident clearly and factually — never soften or omit it. State what
  happened and the action the worker took. IF the log provides the incident report's status/outcome,
  state it exactly; if the log does NOT provide it, do not invent a status. Never editorialise it.
- Output ONLY the summary text. No headings, no preamble.`;

// Turn a compiled shift log (the "source log") into the warm progress summary.
export async function generateShiftReport(sourceLog: string): Promise<string> {
  const userPrompt = `Here is the log for one completed shift. Write the Summary now.\n\n${sourceLog}`;
  return callGemini(SHIFT_REPORT_SYSTEM_PROMPT, userPrompt);
}

// The one function that actually calls Gemini. Both note features share it so the
// request shape, error handling, and model choice live in a single place.
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error(
      "No GEMINI_API_KEY found. Add it to the .env.local file and restart the app.",
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? "";

  if (!text.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }

  return text.trim();
}

// The model name (so we can record which model produced a saved report).
export function currentModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}
