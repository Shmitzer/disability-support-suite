// care-profile.ts — server-side read of a participant's care profile.
//
// Thin DB accessor that returns the profile in the shape care-needs.ts resolution
// expects. Resilient: if the ParticipantCareProfile table isn't applied yet
// (prisma/sql/participant_care_profile.sql), or there's no row for this participant,
// it returns null — which the resolution treats as "not configured → all chips on".
// So chip-tailoring is inert (full grid) until the table is applied and a profile is
// saved; nothing breaks before then.

import { prisma } from "@/lib/prisma";
import type { CareProfile } from "@/lib/care-needs";

export async function getCareProfile(participantId: string): Promise<CareProfile> {
  if (!participantId) return null;
  try {
    const row = await prisma.participantCareProfile.findUnique({
      where: { participantId },
      select: { conditions: true, supportNeeds: true },
    });
    return row ? { conditions: row.conditions, supportNeeds: row.supportNeeds } : null;
  } catch {
    // Table not present yet (Prisma P2021) — degrade to the all-on default.
    return null;
  }
}
