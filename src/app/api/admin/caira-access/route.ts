// PATCH /api/admin/caira-access — grant/revoke Caira web access for a user.
// Body: { userId: string, webAccess: boolean }. Admin and supervisor roles only.
//
// This is the THIRD participant lockout guardrail (alongside the Prisma default and
// the /api/caira override): we refuse to grant web access to a participant here, no
// matter what the caller asks.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { Role } from "@/lib/enums";
import { canManageWebAccess, webAccessAllowedForRole } from "@/lib/caira/roles";

export async function PATCH(request: Request) {
  const requester = await getCurrentWorker();
  if (!requester) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canManageWebAccess(requester.role)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  let body: { userId?: string; webAccess?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.userId || typeof body.webAccess !== "boolean") {
    return NextResponse.json({ error: "userId and webAccess are required." }, { status: 400 });
  }

  const target = await prisma.worker.findUnique({ where: { id: body.userId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // HARD GUARDRAIL: never grant (or even toggle) web access for a participant.
  // TODO(participant web access): a future phase may revisit this, but only behind a
  // separate legal/privacy review, a curated safe-domain allowlist (not full search),
  // and a guardian/coordinator approval flow. Do not relax without all of that.
  if (!webAccessAllowedForRole(target.role)) {
    return NextResponse.json(
      { error: "Web access cannot be granted to participants." },
      { status: 403 },
    );
  }

  // SUPERVISOR SCOPE LIMIT: a supervisor can only manage users in their own org.
  // (Admins/superadmins are not org-limited here.)
  const requesterIsAdmin = requester.role === Role.ADMIN || requester.role === Role.SUPERADMIN;
  if (!requesterIsAdmin) {
    if (!requester.organisationId || target.organisationId !== requester.organisationId) {
      return NextResponse.json(
        { error: "You can only manage users in your own organisation." },
        { status: 403 },
      );
    }
  }

  try {
    await prisma.worker.update({
      where: { id: target.id },
      data: {
        cairaWebAccess: body.webAccess,
        cairaWebAccessGrantedAt: body.webAccess ? new Date() : null,
        cairaWebAccessGrantedBy: body.webAccess ? requester.id : null,
      },
    });
  } catch (err) {
    console.error("caira-access update failed:", err);
    return NextResponse.json({ error: "Couldn't update access." }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: target.id, webAccess: body.webAccess });
}
