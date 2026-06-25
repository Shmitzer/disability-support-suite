// safetyDetect.ts — a lightweight, deterministic pre-check on participant messages,
// run BEFORE the message reaches Gemini. Belt-and-braces: Gemini's system prompt also
// handles safety, but this catches obvious cases faster and writes the worker flag
// even if the model's response somehow misbehaves.
//
// Intentionally BROAD. Some false positives are fine — it is far better to flag
// "I hurt my knee" than to miss a real concern. The worker sees the flag and applies
// human judgement; nothing here is shown to the participant.

// Phrases that should raise a safety flag. Lower-cased substring match against the
// participant's message. Kept as plain phrases (not a clever regex) so it's easy for
// a non-engineer to read and extend.
const SAFETY_TERMS = [
  "hurt",
  "hurting",
  "hit me",
  "hitting me",
  "scared",
  "unsafe",
  "afraid",
  "hate myself",
  "want to die",
  "kill myself",
  "kill me",
  "end it",
  "someone touched",
  "touching me",
  "abuse",
  "abusing",
  "emergency",
  "help me",
  "call police",
  "call 000",
  "run away",
  "lock me",
  "not allowed",
  "can't leave",
  "cant leave",
  "they won't let me",
  "they wont let me",
];

export type SafetyCheck = { flagged: boolean; reason?: string };

// Quick keyword pre-check. Returns the first matching term in the reason so the
// worker can see what triggered the flag.
export function quickSafetyCheck(message: string): SafetyCheck {
  const lower = message.toLowerCase();
  for (const term of SAFETY_TERMS) {
    if (lower.includes(term)) {
      return { flagged: true, reason: `keyword match: ${term}` };
    }
  }
  return { flagged: false };
}
