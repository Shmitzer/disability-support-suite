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
    // tenant-ok: `where` (built above) scopes to the caller's org (supervisor) or own
    // flags (worker) — the guard just can't see the token through the variable.
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

  // Scope the mark-seen to the same flags the caller may READ (GET above): a supervisor
  // to their own org, a worker to flags routed to them. Without this, any non-participant
  // could suppress another org's safety flag by id (IDOR). updateMany lets us scope the
  // WHERE and treat a 0-row result as not-found.
  const scope =
    cairaPersona(worker.role) === "supervisor"
      ? { ...(worker.organisationId ? { organisationId: worker.organisationId } : {}) }
      : { workerId: worker.id };

  try {
    // tenant-ok: `scope` (built above) constrains the update to the caller's org
    // (supervisor) or own flags (worker) — variable-based scoping the guard can't see.
    const res = await prisma.cairaFlag.updateMany({
      where: { id: body.flagId, ...scope },
      data: { seenByWorker: true, seenAt: new Date() },
    });
    if (res.count === 0) return NextResponse.json({ error: "Flag not found." }, { status: 404 });
  } catch (err) {
    console.error("caira flag mark-seen failed:", err);
    return NextResponse.json({ error: "Couldn't update flag." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
