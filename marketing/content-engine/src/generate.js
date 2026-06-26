// Draft generator. Turns the content arc into post drafts in your voice.
// Uses the Claude API if ANTHROPIC_API_KEY is set; otherwise emits a
// structured stub you fill in. Either way, YOU review before anything posts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

const TYPE_GUIDANCE = {
  VALUE: "Pure usefulness. Do NOT mention the app at all. Leave the reader better off whether or not they ever buy anything.",
  INTRO: "Personal and human. Founder voice. Build trust. No call to action beyond 'say hi' / share their experience.",
  COMMUNITY: "Ask one genuine open question. Short. Designed to get replies you will answer personally.",
  SOFT_APP: "Honest, disclosed mention of the app you built. State plainly 'I built this'. Describe the value, invite (don't pressure) people to try it. Include the link once."
};

function buildPrompt(cfg, item) {
  return `You are drafting ONE organic Facebook Page post for an NDIS audience.

BRAND VOICE: ${cfg.brand.voice}
FOUNDER STORY (background, do not paste verbatim): ${cfg.brand.founderStory}
AUDIENCE: ${cfg.audience.primary}. Secondary: ${cfg.audience.secondary}.
AUDIENCE TONE NOTES: ${cfg.audience.tone_notes}
APP: ${cfg.app.name} — ${cfg.app.oneLiner}. Link: ${cfg.app.link}

POST TYPE: ${item.type}
TYPE RULES: ${TYPE_GUIDANCE[item.type]}
TOPIC: ${item.topic}
BRIEF: ${item.brief}

Hard rules:
- Australian spelling. Plain language. No hype, no emojis-spam (1-2 max).
- Transparent and authentic. If it is a SOFT_APP post, explicitly disclose you built the app.
- Never imply you are anyone other than yourself. No fake scarcity, no manipulation.
- Length: 60-150 words. End VALUE/COMMUNITY posts with a question.

Return ONLY the post text, ready to publish.`;
}

// Optional "voice pass": a second rewrite that strips the flat, even AI cadence
// and roughs the rhythm toward how a real person types. This is QUALITY control
// for posts YOU publish as yourself — NOT detector evasion or disguising a bot.
// Enable with VOICE_PASS=1.
function voicePassPrompt(cfg, text) {
  return `Rewrite this Facebook post so it sounds like a real person typed it, not an AI.

Keep the meaning, length, and any disclosure ("I built this") exactly.
Make it more human: vary sentence length (some short. some longer), use the
occasional contraction or aside, cut any phrasing that feels generic or corporate,
keep Australian spelling. Do NOT add hype or new claims. Do NOT make it longer.

Voice to match: ${cfg.brand.voice}

POST:
${text}

Return ONLY the rewritten post.`;
}

async function callClaude(client, prompt, maxTokens = 600) {
  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }]
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

export async function generatePost(cfg, item) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return `[[DRAFT STUB — set ANTHROPIC_API_KEY to auto-draft, or write this yourself]]
Type: ${item.type} | Topic: ${item.topic}
Guidance: ${TYPE_GUIDANCE[item.type]}
Brief: ${item.brief}`;
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key });
  let text = await callClaude(client, buildPrompt(cfg, item));
  if (process.env.VOICE_PASS === "1") {
    text = await callClaude(client, voicePassPrompt(cfg, text));
  }
  return text;
}
