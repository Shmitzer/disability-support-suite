// Throwaway test harness for the task-1g note prompt.
// Fills the prompt template's two slots ({{DETAIL_LEVEL}}, {{GLOSSARY}}) with the
// agreed defaults, feeds Gemini a realistic shift log, and prints the Summary.
// Run from the disability-support-suite/ folder. Delete after we've tuned the prompt.

import { readFileSync } from "node:fs";

// --- Load GEMINI_API_KEY / GEMINI_MODEL from .env.local ---------------------
const env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[m[1]] = v;
  }
} catch (e) {
  console.error("Could not read .env.local:", e.message);
}
const apiKey = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
if (!apiKey) {
  console.error("No GEMINI_API_KEY in .env.local — cannot run the test.");
  process.exit(1);
}

// --- The two editable slots (defaults; Phase 4 lets admins/managers change) ---
const DETAIL_LEVEL = `Match the length and depth to the shift itself: a short, simple shift gets a brief note; a long or complex shift gets a fuller, more detailed one. Cover every event and all support provided. As a rough guide an average shift runs about 250–350 words (a few solid paragraphs); go shorter or longer as the shift genuinely warrants. Do not pad to reach a length, and do not over-compress. Include the time an event occurred where it helps the reader, and a duration only when it can be derived from the log.`;

const GLOSSARY = `    DSW = Disability Support Worker     CW  = Case Worker
    OM  = Operations Manager            TL  = Team Leader
    SC  = Support Coordinator           LAC = Local Area Coordinator
    OT  = Occupational Therapist        PT  = Physiotherapist
    SP  = Speech Pathologist            Psych = Psychologist
    RN  = Registered Nurse              EN  = Enrolled Nurse
    GP  = General Practitioner          BSP = Behaviour Support Practitioner
    AHA = Allied Health Assistant       PM  = Plan Manager
    NOK = Next of Kin                   POA = Power of Attorney
    PG  = Public Guardian               EC  = Emergency Contact`;

// --- The finalised system prompt (template with both slots filled) -----------
const SYSTEM_PROMPT = `You are an assistant for Disability Support Workers (DSWs) in New South Wales, Australia.
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
  state it exactly (e.g. "completed", or a recorded decision such as "no report required" / "to be
  completed"); if the log does NOT provide it, do not invent a status. Never editorialise the decision.
- Output ONLY the summary text. No headings, no preamble.`;

// --- A realistic version of the live Priya shift (with a movie outing) --------
const USER_PROMPT = `Here is the log for one completed shift. Write the Summary now.

Participant: Priya Sharma
Support worker: DSW Edward Neppl
Date: Wednesday 17 June 2026
Scheduled time: 9:41am – 1:41pm
Location: Community access — Charlestown Square
Clocked on: 9:57am
Clocked off: 1:35pm

Log entries (recorded time — category — worker's note):
10:05am — Fluids — Offered water, Priya drank a full glass.
10:40am — Meal — Priya chose a toasted sandwich at the food court and ate all of it; good appetite.
12:50pm — Activity — Went to the movies. We left for the cinema at 11am, the film started about 11:15 and finished around 12:40, then we walked back. Priya told me she had a good time.
12:55pm — Incident — Priya had a minor stumble on a step near the cinema exit. No injury. I helped her to a seat and checked her over; she was fine to continue.
1:05pm — Activity — Sat and had a chat with Priya about her father.
1:15pm — Meds — Gave midday medication as per the chart; no issues.`;

// --- Call Gemini -------------------------------------------------------------
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: USER_PROMPT }] }],
      generationConfig: { temperature: 0.4 },
    }),
  },
);

if (!res.ok) {
  console.error(`AI request failed (${res.status}):`, await res.text());
  process.exit(1);
}
const data = await res.json();
const text =
  data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

console.log("\n=================  MODEL: " + model + "  =================\n");
console.log(text.trim());
console.log("\n========================================================\n");
