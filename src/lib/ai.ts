/**
 * ai.ts — the ONE place in the app that talks to an AI provider.
 *
 * Right now it uses Google Gemini (free tier). To upgrade later (e.g. to Claude),
 * you only change this file — nothing else in the app needs to know which AI is used.
 */

import { DETAIL_LEVEL, GLOSSARY } from "@/lib/note-config";
import { scrubPII } from "@/lib/pii";
import { extractionCatalogue, type ExtractedItem } from "@/lib/note-extraction";

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

// Safe template fallbacks shown when the AI can't produce a usable note (Rule 11).
const PROGRESS_NOTE_FALLBACK =
  "An automated note could not be generated. Please write the progress note from your rough notes before saving.";
const SHIFT_REPORT_FALLBACK =
  "An automated summary could not be generated for this shift. Please review the recorded activity log and write the summary before approving.";

// A produced note is usable if it has real content and no leftover scrub tokens
// (a PERSON_n that survived means the model mangled it — fail rather than leak it).
function isUsableNote(out: string): boolean {
  return out.trim().length >= 20 && !/PERSON_\d+/.test(out);
}

// Generate, validate, retry once, then fall back to a template (Rule 11). Hard API
// errors (missing key, network) still propagate to the caller.
async function generateValidated(
  system: string,
  userPrompt: string,
  restore: (s: string) => string,
  fallback: string,
  extraConfig: Record<string, unknown> = {},
): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = restore(await callGemini(system, userPrompt, extraConfig));
    if (isUsableNote(out)) return out;
    console.warn(`AI output failed validation (attempt ${attempt}/2).`);
  }
  return fallback;
}

export async function generateProgressNote(params: {
  participantName: string;
  rawNotes: string;
}): Promise<string> {
  // Scrub PII before the prompt leaves the app (Rule 2); restore names after.
  const { text: userPrompt, restore } = scrubPII(
    `Participant: ${params.participantName}\n\n` +
      `Rough shift notes from the support worker:\n"""\n${params.rawNotes}\n"""\n\n` +
      `Write the progress note now.`,
    [params.participantName],
  );

  return generateValidated(SYSTEM_PROMPT, userPrompt, restore, PROGRESS_NOTE_FALLBACK);
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

// A clarifying question + the worker's confirmed answer (task 1i).
export type Clarification = { q: string; a: string };

// Turn a compiled shift log (the "source log") into the warm progress summary.
// `clarifications` are extra details the worker has CONFIRMED during approval —
// we hand them to the AI as observed facts it may now include.
export async function generateShiftReport(
  sourceLog: string,
  clarifications: Clarification[] = [],
  people: string[] = [],
): Promise<string> {
  let userPrompt = `Here is the log for one completed shift. Write the Summary now.\n\n${sourceLog}`;
  if (clarifications.length > 0) {
    const extra = clarifications
      .map((c) => `Q: ${c.q}\nWorker's confirmed answer: ${c.a}`)
      .join("\n\n");
    userPrompt +=
      `\n\nThe worker has CONFIRMED these additional details during review. Treat them as observed ` +
      `facts you may now include (the same rules still apply — do not embellish beyond them):\n${extra}`;
  }
  // Scrub PII before sending (Rule 2); validate + retry + restore (Rule 11).
  const { text, restore } = scrubPII(userPrompt, people);
  return generateValidated(SHIFT_REPORT_SYSTEM_PROMPT, text, restore, SHIFT_REPORT_FALLBACK);
}

// The system prompt for the clarifying-questions step (task 1i). The AI surfaces
// gaps; the WORKER supplies the observed facts — so feelings end up confirmed, not
// assumed. It must never invite guessing.
const CLARIFY_SYSTEM_PROMPT = `You help a Disability Support Worker improve a shift progress note before they approve it.
You are given the shift log and the current draft summary.

Suggest a SHORT list (at most 4) of clarifying questions whose answers — which the worker can confirm
from what they actually observed — would make the note more complete or accurate.

Good questions ask about observable, factual gaps, for example:
- the outcome of an activity, or how the participant responded to it;
- whether support was given independently or with prompting/assistance;
- whether the participant expressed how they felt about something (only how they EXPRESSED it, not how
  they "really" felt);
- a follow-up or action that may be needed.

Rules:
- NEVER ask the worker to speculate, guess, or interpret anyone's feelings or thoughts. Only ask about
  things the worker could directly observe or that the participant actually said.
- Do not ask about things already clearly covered in the log or summary.
- If the note is already complete and nothing useful is missing, return an empty list.
- Return ONLY a JSON array of question strings, e.g. ["...", "..."]. No other text.`;

// Ask the AI for clarifying questions. Returns at most 4 plain-string questions
// (empty if the note already looks complete).
export async function generateClarifyingQuestions(
  sourceLog: string,
  summary: string,
  people: string[] = [],
): Promise<string[]> {
  // Scrub PII before sending (Rule 2); restore names in each returned question.
  const { text, restore } = scrubPII(
    `Shift log:\n${sourceLog}\n\nDraft summary:\n${summary}\n\nSuggest the clarifying questions now.`,
    people,
  );
  const raw = await callGemini(CLARIFY_SYSTEM_PROMPT, text, {
    responseMimeType: "application/json",
  });
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => restore(q))
        .slice(0, 4);
    }
  } catch {
    // If the model didn't return clean JSON, treat it as "no questions".
  }
  return [];
}

// The system prompt for ENTRY-LEVEL clarifying questions (asked while the worker is
// logging a single thing, e.g. an Activity "shopping trip"). The point is to nudge the
// worker — in a warm, human, specific way — to capture the detail that's actually
// missing for THIS entry, instead of a generic "what outcomes were achieved".
const ENTRY_QUESTIONS_SYSTEM_PROMPT = `A Disability Support Worker is logging ONE entry during a shift. Help them capture it well by suggesting a few short, friendly, SPECIFIC questions they could answer in their note.

You are given the category, any structured details already picked, the participant's name, and the note so far (which may be empty).

Write 2-3 questions that sound like a warm colleague asking — natural and specific to what's being logged. Use the participant's first name where it reads naturally. Examples for a shopping outing: "Did {name} buy anything while you were out?", "How did the shopping trip go?", "Was there anything {name} needed a hand with at the shops?".

Rules:
- Be SPECIFIC to the category and details given — never generic like "what outcomes were achieved".
- Ask only about things the worker could directly observe or that the participant actually said or did. NEVER ask them to guess, interpret, or infer anyone's feelings, mood, or thoughts.
- Don't ask about detail that's already clearly captured in the note.
- Keep each question to one short sentence.
- If nothing useful is missing, return an empty list.
- Return ONLY a JSON array of question strings. No other text.`;

// Suggest a few human, entry-specific clarifying questions for the thing being logged.
// Returns at most 3 plain strings (empty if nothing useful is missing or on error).
export async function suggestEntryQuestions(input: {
  label: string; // the category's human label, e.g. "Activity"
  detail?: string | null; // assembled picks, e.g. "Community access · Outing"
  note?: string; // the worker's note so far (may be empty)
  participantName?: string;
}): Promise<string[]> {
  const people = input.participantName ? [input.participantName] : [];
  const prompt = [
    `Category: ${input.label}`,
    input.detail ? `Details picked: ${input.detail}` : null,
    `Participant: ${input.participantName ?? "the participant"}`,
    `Note so far: ${input.note?.trim() ? input.note.trim() : "(empty)"}`,
    `Suggest the questions now.`,
  ]
    .filter(Boolean)
    .join("\n");
  // Scrub PII before sending (Rule 2); restore the name in each returned question.
  const { text, restore } = scrubPII(prompt, people);
  let raw: string;
  try {
    raw = await callGemini(ENTRY_QUESTIONS_SYSTEM_PROMPT, text, {
      responseMimeType: "application/json",
    });
  } catch {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => restore(q).trim())
        .slice(0, 3);
    }
  } catch {
    // Not clean JSON → treat as "no questions".
  }
  return [];
}

// --- Note → structured log entries (extraction) -----------------------------
//
// Turn a free-text shift note into a list of categorised log items mapped EXACTLY
// onto the capture chips. The category catalogue is generated from LOG_CATEGORIES
// (note-extraction.ts) so the prompt can't drift from the real chips. The model
// resolves relative times ("then", "after", "about 7:30") into absolute HH:MM,
// anchored to the note's start time. Mapping/validation of the result is pure (see
// mapExtractedToEntries); this function only does the model call + PII handling.
const EXTRACT_SYSTEM_PROMPT = `You convert a disability support worker's free-text shift note into a list of structured log entries.

Return ONLY a JSON array. Each element has this shape:
{ "category": <one category key below>, "time": "HH:MM" (24-hour), "timeEstimated": <true|false>, "note": <short factual observation in the worker's words>, "groups": { <groupKey>: [<option>, ...] }, "amountMl": <number, ONLY for Fluids> }

Categories and their allowed groups/options — use these EXACTLY; never invent a category, group, or option:
{{CATALOGUE}}

Rules:
- Map each distinct activity to the SINGLE best-fitting category. If something fits no category, omit it (it stays in the original note).
- Use ONLY the listed option values for a group. For a group marked "or free text", you may use a short free-text value if none fit.
- TIME: the note's start time is given. Resolve every relative reference into an absolute "HH:MM" in chronological order, never going backwards. If a time isn't stated, estimate a sensible time after the previous item.
- timeEstimated: set TRUE when you inferred/guessed the time (it was not clearly stated in the note), FALSE when the note stated the time explicitly (e.g. "at 2pm", "around 14:30"). This tells the worker which times to double-check.
- Keep "note" brief and factual — no opinions, no clinical judgements, no invented detail.
- Output ONLY the JSON array. No preamble, no code fences.`;

export async function extractLogItems(
  noteText: string,
  startTime: string,
  people: string[] = [],
  allowedKeys?: string[],
): Promise<ExtractedItem[]> {
  const system = EXTRACT_SYSTEM_PROMPT.replace("{{CATALOGUE}}", extractionCatalogue(allowedKeys));
  // Scrub PII before the note leaves the app (Rule 2); restore in returned strings.
  const { text, restore } = scrubPII(`Note start time: ${startTime}\n\nNote:\n${noteText}`, people);
  const raw = await callGemini(system, text, { responseMimeType: "application/json" });

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is { category: string } & Record<string, unknown> =>
          !!x && typeof x === "object" && typeof (x as { category?: unknown }).category === "string",
      )
      .map((x) => ({
        category: x.category,
        time: typeof x.time === "string" ? x.time : "",
        // Default to estimated when the model omits the flag — safer to prompt a check
        // than to silently present a guessed time as confirmed.
        timeEstimated: x.timeEstimated !== false,
        note: typeof x.note === "string" ? restore(x.note) : "",
        groups: sanitiseGroups(x.groups, restore),
        amountMl: typeof x.amountMl === "number" ? x.amountMl : undefined,
      }));
  } catch {
    // Model didn't return clean JSON — treat as "nothing extracted".
    return [];
  }
}

// Coerce the model's `groups` object into Record<string, string[]>, restoring any
// scrubbed names in free-text values (fixed options carry no tokens, so it's a no-op
// for them).
function sanitiseGroups(
  groups: unknown,
  restore: (s: string) => string,
): Record<string, string[]> | undefined {
  if (!groups || typeof groups !== "object") return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(groups as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.filter((s): s is string => typeof s === "string").map((s) => restore(s));
    }
  }
  return out;
}

// --- Caira assistant ("your friend") -----------------------------------------
//
// A warm, plain-English assistant answering NDIS / participant / company / general
// questions. Person- and org-specific facts come ONLY from the retrieved context
// (the user's context store, scoped to what they may see — see assistant-actions.ts);
// the model must not invent them. PII is scrubbed before the call and restored after
// (Rule 2). Designed for voice in / voice out (STT via transcribeAudio; TTS is the
// browser's SpeechSynthesis, wired in the UI by cd).
const CAIRA_SYSTEM_PROMPT = `You are Caira — a warm, calm, plain-English assistant for Australian disability support workers, the participants they support, and their families. You answer questions about the NDIS, the people the user supports, the organisation, and general topics, like a knowledgeable friend.

Rules:
- For anything about a specific person, the organisation, or the user's own situation, use ONLY the CONTEXT provided below. If the answer isn't in the context, say you don't have that information — never guess or invent details about a person.
- General NDIS / how-things-work questions can use your general knowledge, kept accurate and plain.
- Do NOT give medical, clinical, legal, or financial advice as fact. Suggest who to check with (e.g. the coordinator, a health professional) when relevant.
- Be concise and spoken-friendly: short sentences, no markdown, no lists of symbols — this answer may be read aloud.
- Australian English, warm and respectful. Never infer or assert how someone feels.`;

// Answer a question as Caira, grounded in the supplied context snippets.
export async function askCaira(input: {
  question: string;
  context?: string[]; // retrieved context snippets the user is permitted to see
  people?: string[]; // names to scrub before the call (participants/workers)
}): Promise<string> {
  const ctx = (input.context ?? []).filter(Boolean);
  const userPrompt = [
    ctx.length ? `CONTEXT (use only this for person/org-specific facts):\n${ctx.join("\n---\n")}` : "CONTEXT: (none provided)",
    `\nQUESTION: ${input.question}`,
    `\nAnswer now, spoken-friendly.`,
  ].join("\n");

  const { text, restore } = scrubPII(userPrompt, input.people ?? []);
  let raw: string;
  try {
    raw = await callGemini(CAIRA_SYSTEM_PROMPT, text);
  } catch {
    return "Sorry, I can't answer that right now. Please try again in a moment.";
  }
  return restore(raw).trim();
}

// The one function that actually calls Gemini. All note features share it so the
// request shape, error handling, and model choice live in a single place.
// `extraConfig` lets a caller add generationConfig options (e.g. JSON output).
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  extraConfig: Record<string, unknown> = {},
): Promise<string> {
  return geminiGenerate(systemPrompt, [{ text: userPrompt }], { extraConfig });
}

// Core Gemini call shared by the text features (callGemini) and audio transcription
// (transcribeAudio). Takes the raw `parts` array so a caller can mix text +
// inlineData (audio). `allowEmpty` lets transcription return "" for silence instead
// of treating an empty response as an error.
async function geminiGenerate(
  systemPrompt: string,
  parts: unknown[],
  opts: { extraConfig?: Record<string, unknown>; allowEmpty?: boolean } = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error(
      "No GEMINI_API_KEY found. Add it to the .env.local file and restart the app.",
    );
  }

  // Free-tier Gemini often returns 503 (busy) or 429 (rate limit) for a moment.
  // Those are temporary, so we retry a few times with a growing pause before
  // giving up. Other errors (e.g. a bad request) fail straight away.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.4, ...(opts.extraConfig ?? {}) },
  });

  const MAX_ATTEMPTS = 4;
  let response: Response | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (response.ok) break;

    const retryable = response.status === 503 || response.status === 429;
    if (retryable && attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 1500)); // 1.5s, 3s, 4.5s
      continue;
    }

    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response!.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? "";

  if (!text.trim() && !opts.allowEmpty) {
    throw new Error("The AI returned an empty response. Please try again.");
  }

  return text.trim();
}

// Is an AI provider configured? Lets API routes degrade gracefully (e.g. tell the
// worker transcription is unavailable) instead of throwing when no key is set.
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// --- Voice transcription ----------------------------------------------------
//
// Turn a recording of a worker's spoken shift note into text, which they then
// review/edit before saving (the typed note stays the source of truth — Rule 11).
//
// ⚠️ PII / Rule 2 caveat: we scrub TEXT before sending it to the model, but audio
// can't be scrubbed first — the recording (which may name people) goes to the AI
// provider to be transcribed. That's an unavoidable cross-border disclosure for any
// cloud transcription; it's gated behind GEMINI_API_KEY and the worker choosing to
// record. Note GENERATION still scrubs the transcript downstream. Revisit with a
// DPA / on-device transcription before real participant data (see Drive
// "cross-border data disclosure").
const TRANSCRIBE_SYSTEM_PROMPT = `You transcribe an audio recording of a disability support worker's spoken shift note.
Rules:
- Output ONLY the verbatim transcript as plain text. No preamble, no speaker labels, no timestamps, no commentary.
- Use Australian English spelling. Add sensible punctuation and capitalisation.
- Do NOT summarise, correct, or add anything that was not said.
- If the audio is silent or unintelligible, output nothing at all.`;

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const parts = [
    { text: "Transcribe the following audio recording." },
    { inlineData: { mimeType, data: audioBase64 } },
  ];
  const raw = await geminiGenerate(TRANSCRIBE_SYSTEM_PROMPT, parts, {
    extraConfig: { temperature: 0 },
    allowEmpty: true,
  });
  return cleanTranscript(raw);
}

// --- Document OCR (photo → text) --------------------------------------------
//
// Extract the text from a photographed document so it can be saved/formatted and fed
// into the assistant context store. Same Rule 2 caveat as audio: an image can't be
// scrubbed before sending, so a photographed document (which may name people) goes to
// the AI provider. Gated behind GEMINI_API_KEY + the user choosing to capture it.
const OCR_SYSTEM_PROMPT = `You extract the text from a photographed document.
- Output the document's text faithfully, preserving line breaks and obvious structure (headings, lists, tables as plain text).
- Do NOT summarise, translate, correct, or add anything that is not in the image.
- Australian English. If the image has no legible text, output nothing at all.`;

export async function extractTextFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const parts = [
    { text: "Extract all text from the following document image." },
    { inlineData: { mimeType, data: imageBase64 } },
  ];
  const raw = await geminiGenerate(OCR_SYSTEM_PROMPT, parts, {
    extraConfig: { temperature: 0 },
    allowEmpty: true,
  });
  return raw.trim();
}

// Strip the boilerplate models sometimes wrap a transcript in ("Sure, here's the
// transcript:", surrounding quotes) so we store just the spoken words. Pure —
// unit-tested.
export function cleanTranscript(raw: string): string {
  let t = raw.trim();
  t = t.replace(
    /^(sure[,.!]?\s*)?(here(?:'s| is)\s+)?(the\s+)?(verbatim\s+)?transcript\s*[:\-—]\s*/i,
    "",
  );
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

// The model name (so we can record which model produced a saved report).
export function currentModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}
