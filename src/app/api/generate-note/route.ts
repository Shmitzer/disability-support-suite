// API route: POST /api/generate-note
// Receives the worker's rough notes, asks the AI to clean them up,
// saves the result to the local database, and returns the finished note.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProgressNote } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { participantId, rawNotes } = await request.json();

    if (!participantId || typeof rawNotes !== "string" || !rawNotes.trim()) {
      return NextResponse.json(
        { error: "Please choose a participant and enter some notes." },
        { status: 400 },
      );
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    const generatedNote = await generateProgressNote({
      participantName: participant.name,
      rawNotes,
    });

    const saved = await prisma.progressNote.create({
      data: { participantId, rawNotes, generatedNote },
    });

    return NextResponse.json({ id: saved.id, generatedNote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
