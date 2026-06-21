// session.ts — the app's identity seam: the ONE place that answers "who is using
// the app, and what can they do".
//
// Today this reads the dev role-switch cookie (no passwords yet). When Supabase
// Auth lands (Phase E) only the internals of getCurrentUser() change — every
// caller stays the same. Call getCurrentUser() from new code; getCurrentWorker is
// kept as a deprecated alias so existing call sites keep working until they migrate.

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SectorMode } from "@/lib/enums";

export const WORKER_COOKIE = "dsw_worker_id";

// Everyone in the app, for the switcher dropdown.
export async function listWorkers() {
  return prisma.worker.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

// The user currently "logged in". Falls back to the first worker so the app always
// has someone in context during development.
export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(WORKER_COOKIE)?.value;

  if (id) {
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (worker) return worker;
  }

  return prisma.worker.findFirst({ orderBy: { createdAt: "asc" } });
}

/** @deprecated use getCurrentUser */
export const getCurrentWorker = getCurrentUser;

// The sector mode for the current user's organisation (default NDIS). Drives the
// sectorConfig label maps so the UI can be re-skinned per sector (Rule 4).
export async function getCurrentSector(): Promise<SectorMode> {
  const user = await getCurrentUser();
  if (!user?.organisationId) return SectorMode.NDIS;
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  });
  return (org?.sectorMode as SectorMode) ?? SectorMode.NDIS;
}
