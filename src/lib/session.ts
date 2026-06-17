// session.ts — the dev "who am I" role-switch.
// No passwords yet: we store the chosen worker's id in a cookie and read it back.
// Real PIN login replaces this later (Phase 4). Everything else can assume
// getCurrentWorker() tells it who is using the app and what role they have.

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const WORKER_COOKIE = "dsw_worker_id";

// Everyone in the app, for the switcher dropdown.
export async function listWorkers() {
  return prisma.worker.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

// The worker currently "logged in". Falls back to the first worker so the app
// always has someone in context during development.
export async function getCurrentWorker() {
  const store = await cookies();
  const id = store.get(WORKER_COOKIE)?.value;

  if (id) {
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (worker) return worker;
  }

  return prisma.worker.findFirst({ orderBy: { createdAt: "asc" } });
}
