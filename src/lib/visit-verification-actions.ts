// visit-verification-actions.ts — #11 EVV (AU-light). Records geolocation + method at
// clock on/off as a verification record. LOGIC ONLY — cd captures the browser geo and
// calls this alongside clock on/off. Region-configurable later for US Medicaid-grade EVV.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";

export type VerifyResult = { ok: boolean; error?: string };

export async function recordVisitVerification(input: {
  shiftId: string;
  event: "CLOCK_ON" | "CLOCK_OFF";
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  method?: "gps" | "manual";
}): Promise<VerifyResult> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false, error: "Not signed in." };
  if (input.event !== "CLOCK_ON" && input.event !== "CLOCK_OFF") {
    return { ok: false, error: "Invalid event." };
  }
  // Only the allocated worker may verify their own shift.
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    select: { id: true, allocatedToId: true, organisationId: true },
  });
  if (!shift || shift.allocatedToId !== worker.id) {
    return { ok: false, error: "This isn't your shift." };
  }
  try {
    await prisma.visitVerification.create({
      data: {
        shiftId: shift.id,
        organisationId: shift.organisationId,
        event: input.event,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        accuracy: input.accuracy ?? null,
        method: input.method ?? "gps",
        capturedById: worker.id,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("recordVisitVerification failed:", err);
    return { ok: false, error: "Couldn't record verification — the table may not be set up yet." };
  }
}
