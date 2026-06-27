// notifications.ts — #5 in-app notifications (store + emit + read). LOGIC ONLY
// (cd renders the bell/feed). Delivery is in-app only for now; email/push can layer
// on later. All writes are best-effort (resilient if the table isn't applied yet).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { Role } from "@/lib/enums";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  organisationId?: string | null;
};

// Create one notification (server-internal; called from other actions). Best-effort.
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        organisationId: input.organisationId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  } catch {
    /* table not applied yet — non-fatal */
  }
}

// Notify the org's managers (ADMIN/SUPERVISOR) — e.g. a new incident.
export async function notifyOrgManagers(
  organisationId: string | null,
  n: Omit<NotifyInput, "userId" | "organisationId">,
): Promise<void> {
  if (!organisationId) return;
  try {
    const managers = await prisma.worker.findMany({
      where: { organisationId, role: { in: [Role.ADMIN, Role.SUPERVISOR] } },
      select: { id: true },
    });
    await Promise.all(managers.map((m) => notify({ ...n, userId: m.id, organisationId })));
  } catch {
    /* ignore */
  }
}

// --- Recipient-facing (the signed-in user's own notifications) ---
export async function listMyNotifications(opts?: { unreadOnly?: boolean; take?: number }) {
  const worker = await getCurrentWorker();
  if (!worker) return [];
  try {
    return await prisma.notification.findMany({
      where: { userId: worker.id, ...(opts?.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts?.take ?? 50,
    });
  } catch {
    return [];
  }
}

export async function unreadCount(): Promise<number> {
  const worker = await getCurrentWorker();
  if (!worker) return 0;
  try {
    return await prisma.notification.count({ where: { userId: worker.id, readAt: null } });
  } catch {
    return 0;
  }
}

export async function markRead(id: string): Promise<{ ok: boolean }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false };
  try {
    await prisma.notification.updateMany({
      where: { id, userId: worker.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  const worker = await getCurrentWorker();
  if (!worker) return { ok: false };
  try {
    await prisma.notification.updateMany({
      where: { userId: worker.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
