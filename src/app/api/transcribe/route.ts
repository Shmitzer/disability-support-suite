// API route: POST /api/transcribe
// Receives a short audio recording of a worker's spoken shift note and returns the
// transcript. The worker reviews/edits it before saving (Rule 11 — the typed note
// is the source of truth). All AI access stays behind src/lib/ai.ts (Rule 1).
//
// PII note (Rule 2): audio can't be scrubbed before sending — see the caveat on
// transcribeAudio() in src/lib/ai.ts. Gated behind GEMINI_API_KEY.

import { NextResponse } from "next/server";
import { getCurrentWorker } from "@/lib/session";
import { transcribeAudio, aiConfigured } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

// Base64 inflates ~33%, so ~14M chars ≈ ~10 MB of audio — plenty for a spoken note
// (16 kHz mono WAV is ~32 KB/s → ~5 min). Reject larger to bound cost/latency.
const MAX_AUDIO_B64 = 14_000_000;

export async function POST(request: Request) {
  try {
    const worker = await getCurrentWorker();
    if (!worker) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // Throttle per worker (shares the rate-limit layer; no-op until Upstash is set).
    const rl = await checkRateLimit(`transcribe:${worker.id}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "You've hit the transcription limit for now. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    if (!aiConfigured()) {
      return NextResponse.json(
        { error: "Voice transcription isn't configured. Please type your note." },
        { status: 503 },
      );
    }

    const { audio, mimeType } = await request.json();
    if (typeof audio !== "string" || !audio) {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }
    if (typeof mimeType !== "string" || !mimeType.startsWith("audio/")) {
      return NextResponse.json({ error: "Unsupported audio format." }, { status: 400 });
    }
    if (audio.length > MAX_AUDIO_B64) {
      return NextResponse.json(
        { error: "That recording is too long. Keep voice notes under ~5 minutes." },
        { status: 413 },
      );
    }

    const transcript = await transcribeAudio(audio, mimeType);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("transcribe failed:", err);
    return NextResponse.json(
      { error: "Couldn't transcribe that just now. Please try again, or type your note." },
      { status: 502 },
    );
  }
}
