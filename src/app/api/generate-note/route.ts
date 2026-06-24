// API route: POST /api/generate-note
// Receives the worker's rough notes, asks the AI to clean them up,
// saves the result to the local database, and returns the finished note.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner, tenantScope } from "@/lib/tenant";
import { generateProgressNote } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const worker = await getCurrentWorker();
    if (!worker) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // Throttle the LLM endpoint per worker (no-op until Upstash is configured).
    const rl = await checkRateLimit(`generate-note:${worker.id}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "You've hit the note-generation limit for now. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { participantId, rawNotes } = await request.json();

    if (!participantId || typeof rawNotes !== "string" || !rawNotes.trim()) {
      return NextResponse.json(
        { error: "Please choose a participant and enter some notes." },
        { status: 400 },
      );
    }

    // Scope by tenant: a caller can only generate notes for a participant in their
    // own org (or their own, for solo workers) — never another tenant's by id.
    const participant = await prisma.participant.findFirst({
      where: { id: participantId, ...tenantScope(worker) },
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    const generatedNote = await generateProgressNote({
      participantName: participant.name,
      rawNotes,
    });

    const saved = await prisma.progressNote.create({
      data: { participantId, rawNotes, generatedNote, ...tenantOwner(worker) },
    });

    return NextResponse.json({ id: saved.id, generatedNote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
