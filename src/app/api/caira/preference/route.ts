// PATCH /api/caira/preference — a participant sets their Caira language level.
// Body: { level: "simple" | "adjusted" }. Participant role only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { cairaPersona } from "@/lib/caira/roles";

export async function PATCH(request: Request) {
  const worker = await getCurrentWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (cairaPersona(worker.role) !== "participant") {
    return NextResponse.json({ error: "Not a participant." }, { status: 401 });
  }

  let body: { level?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const level = body.level === "adjusted" ? "adjusted" : "simple";
  try {
    await prisma.worker.update({
      where: { id: worker.id },
      data: { participantAILevel: level },
    });
  } catch (err) {
    console.error("caira preference update failed:", err);
    return NextResponse.json({ error: "Couldn't save preference." }, { status: 500 });
  }

  return NextResponse.json({ success: true, level });
}
