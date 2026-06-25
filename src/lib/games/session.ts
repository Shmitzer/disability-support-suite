// Game engine — session recorder.
//
// The ONE place a finished game writes to the database. It records the GameSession,
// rolls XP into ParticipantXP, and — for any goals linked to this game via
// GoalGameLink — appends an immutable GoalProgress row and advances the goal's
// currentValue. System A only: this is the only path that grants therapeutic XP /
// goal progress, and it must never be called from social/multiplayer code.

import { prisma } from "@/lib/prisma";
import { tenantOwner, type TenantActor } from "@/lib/tenant";
import { getGame, isKnownSlug } from "./catalogue";
import { computeXp } from "./engine";
import type { SessionResult } from "./types";

export interface RecordedSession {
  sessionId: string;
  xpEarned: number;
  goalsAdvanced: number;
}

// Persist a finished session and fan its XP out to the participant + linked goals.
// `actor` is the signed-in worker/participant whose tenant the rows are stamped to.
export async function recordSession(
  actor: TenantActor,
  result: SessionResult,
): Promise<RecordedSession> {
  const game = getGame(result.gameSlug);
  if (!game || !isKnownSlug(result.gameSlug)) {
    throw new Error(`Unknown game slug: ${result.gameSlug}`);
  }

  const xpEarned = computeXp(game, {
    completed: result.completed,
    score: result.score,
    maxScore: result.maxScore,
    tier: result.tier,
  });

  const owner = tenantOwner(actor);

  // One transaction so the session, XP and goal progress can't drift apart.
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({
      data: {
        participantId: result.participantId,
        gameSlug: result.gameSlug,
        tier: result.tier,
        difficulty: result.difficulty,
        score: result.score,
        maxScore: result.maxScore,
        durationSecs: result.durationSecs,
        completed: result.completed,
        xpEarned,
        ...owner,
      },
    });

    // Only completed sessions move XP / goals — a quit session is still logged.
    let goalsAdvanced = 0;
    if (result.completed && xpEarned > 0) {
      await tx.participantXP.upsert({
        where: { participantId: result.participantId },
        create: {
          participantId: result.participantId,
          totalXP: xpEarned,
          lastPlayedAt: session.createdAt,
          ...owner,
        },
        update: {
          totalXP: { increment: xpEarned },
          lastPlayedAt: session.createdAt,
        },
      });

      // Find goals (in this tenant) that link this game, and advance each.
      const links = await tx.goalGameLink.findMany({
        where: {
          gameSlug: result.gameSlug,
          goal: {
            participantId: result.participantId,
            status: "active",
            organisationId: owner.organisationId,
          },
        },
      });

      for (const link of links) {
        await tx.goalProgress.create({
          data: {
            goalId: link.goalId,
            sourceType: "game_session",
            sourceId: session.id,
            valueAdded: link.xpPerSession,
            recordedById: owner.userId,
            organisationId: owner.organisationId,
          },
        });
        await tx.nDISGoal.update({
          where: { id: link.goalId },
          data: { currentValue: { increment: link.xpPerSession } },
        });
        goalsAdvanced += 1;
      }
    }

    return { sessionId: session.id, xpEarned, goalsAdvanced };
  });
}
