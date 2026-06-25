// API route: POST /api/games/session
// Records a finished game session and fans its XP out to the participant and any
// linked NDIS goals. System A only — see src/lib/games/session.ts.

import { NextResponse } from "next/server";
import { getCurrentWorker } from "@/lib/session";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { isKnownSlug } from "@/lib/games/catalogue";
import { recordSession } from "@/lib/games/session";
import type { Difficulty, SessionResult, Tier } from "@/lib/games/types";

const TIERS = new Set(["T1", "T2", "T3", "T4", "T5"]);
const DIFFICULTIES = new Set(["easy", "medium", "challenge"]);

export async function POST(request: Request) {
  try {
    const worker = await getCurrentWorker();
    if (!worker) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json();
    const {
      participantId,
      gameSlug,
      tier,
      difficulty,
      score = 0,
      maxScore = 0,
      durationSecs = 0,
      completed = false,
    } = body ?? {};

    if (!participantId || typeof gameSlug !== "string" || !isKnownSlug(gameSlug)) {
      return NextResponse.json(
        { error: "A valid participant and game are required." },
        { status: 400 },
      );
    }
    if (!TIERS.has(tier) || !DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: "Invalid tier or difficulty." }, { status: 400 });
    }

    // Scope: the caller may only record sessions for a participant in their own tenant.
    const participant = await prisma.participant.findFirst({
      where: { id: participantId, ...tenantScope(worker) },
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    const result: SessionResult = {
      participantId,
      gameSlug,
      tier: tier as Tier,
      difficulty: difficulty as Difficulty,
      score: Number(score) || 0,
      maxScore: Number(maxScore) || 0,
      durationSecs: Number(durationSecs) || 0,
      completed: Boolean(completed),
    };

    const recorded = await recordSession(worker, result);
    return NextResponse.json(recorded);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
