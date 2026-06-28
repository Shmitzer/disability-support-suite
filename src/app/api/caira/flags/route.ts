// /api/caira/flags
//   GET   — unreviewed safety flags for the current worker/supervisor.
//   PATCH — mark a flag as seen. Body: { flagId: string }.
//
// Workers see only flags routed to them (workerId = their id); supervisors see all
// unreviewed flags in their organisation. Participants get 401.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { cairaPersona } from "@/lib/caira/roles";

export async function GET() {
  const worker = await getCurrentWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const persona = cairaPersona(worker.role);
  if (persona === "participant") {
    return NextResponse.json({ error: "Not permitted." }, { status: 401 });
  }

  // Supervisors: all unreviewed flags in their org. Workers: only their own.
  const where =
    persona === "supervisor"
      ? { seenByWorker: false, ...(worker.organisationId ? { organisationId: worker.organisationId } : {}) }
      : { seenByWorker: false, workerId: worker.id };

  try {
    const flags = await prisma.cairaFlag.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ flags });
  } catch {
    // Table not applied yet — no flags rather than an error.
    return NextResponse.json({ flags: [] });
  }
}

export async function PATCH(request: Request) {
  const worker = await getCurrentWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (cairaPersona(worker.role) === "participant") {
    return NextResponse.json({ error: "Not permitted." }, { status: 401 });
  }

  let body: { flagId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.flagId) return NextResponse.json({ error: "Missing flagId." }, { status: 400 });

  // Scope the write to exactly the flags this caller may SEE (mirror GET):
  // supervisors → their org; workers → only flags routed to them. Without this
  // any signed-in worker could mark *any* flag in *any* org as seen by id
  // (IDOR), suppressing another org's safety alerts.
  const persona = cairaPersona(worker.role);
  const scope =
    persona === "supervisor"
      ? { id: body.flagId, ...(worker.organisationId ? { organisationId: worker.organisationId } : {}) }
      : { id: body.flagId, workerId: worker.id };

  try {
    const { count } = await prisma.cairaFlag.updateMany({
      where: scope,
      data: { seenByWorker: true, seenAt: new Date() },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Flag not found." }, { status: 404 });
    }
  } catch (err) {
    console.error("caira flag mark-seen failed:", err);
    return NextResponse.json({ error: "Couldn't update flag." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
