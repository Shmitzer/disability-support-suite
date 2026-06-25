// reporting-actions.ts — #10 coordinator stats + CSV exports. LOGIC ONLY (cd renders
// the dashboard + download buttons). Org-scoped, gated on ShiftReadOrg. Each count is
// best-effort so a missing (unapplied) table doesn't break the dashboard.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { toCsv } from "@/lib/reporting";

async function requireOversight() {
  const worker = await getCurrentWorker();
  if (!worker?.organisationId) return null;
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.ShiftReadOrg, { organisationId: worker.organisationId })) {
    return null;
  }
  return worker;
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export type OrgStats = {
  onShiftNow: number;
  logsToday: number;
  openIncidents: number;
  unfilledShifts: number;
  draftNotes: number;
  expiringCredentials: number;
};

// The coordinator dashboard's headline numbers.
export async function orgStats(): Promise<OrgStats | null> {
  const worker = await requireOversight();
  if (!worker) return null;
  const org = worker.organisationId!;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const in30 = new Date(Date.now() + 30 * 86400000);

  const [onShiftNow, logsToday, openIncidents, unfilledShifts, draftNotes, expiringCredentials] =
    await Promise.all([
      safeCount(() => prisma.shift.count({ where: { organisationId: org, status: "IN_PROGRESS" } })),
      safeCount(() => prisma.logEntry.count({ where: { organisationId: org, createdAt: { gte: startOfToday } } })),
      safeCount(() => prisma.incident.count({ where: { organisationId: org, status: { not: "CLOSED" } } })),
      safeCount(() => prisma.shift.count({ where: { organisationId: org, status: "OFFERED" } })),
      safeCount(() => prisma.shiftReport.count({ where: { organisationId: org, status: "DRAFT" } })),
      safeCount(() =>
        prisma.workerCredential.count({
          where: { organisationId: org, expiresAt: { not: null, lte: in30 } },
        }),
      ),
    ]);

  return { onShiftNow, logsToday, openIncidents, unfilledShifts, draftNotes, expiringCredentials };
}

export type CsvResult = { ok: true; csv: string; count: number } | { ok: false; error: string };

// Export shifts in a date range as CSV.
export async function exportShiftsCsv(input?: { from?: string; to?: string }): Promise<CsvResult> {
  const worker = await requireOversight();
  if (!worker) return { ok: false, error: "You don't have permission to export." };
  try {
    const shifts = await prisma.shift.findMany({
      where: {
        organisationId: worker.organisationId!,
        ...(input?.from || input?.to
          ? { scheduledStart: { ...(input?.from ? { gte: new Date(input.from) } : {}), ...(input?.to ? { lte: new Date(input.to) } : {}) } }
          : {}),
      },
      orderBy: { scheduledStart: "asc" },
      select: {
        id: true, status: true, scheduledStart: true, scheduledEnd: true,
        clockOnAt: true, clockOffAt: true, location: true,
        participant: { select: { name: true } },
        allocatedTo: { select: { name: true } },
      },
      take: 5000,
    });
    const csv = toCsv(
      ["ShiftId", "Status", "Participant", "Worker", "ScheduledStart", "ScheduledEnd", "ClockOn", "ClockOff", "Location"],
      shifts.map((s) => [
        s.id, s.status, s.participant?.name ?? "", s.allocatedTo?.name ?? "",
        s.scheduledStart.toISOString(), s.scheduledEnd.toISOString(),
        s.clockOnAt?.toISOString() ?? "", s.clockOffAt?.toISOString() ?? "", s.location ?? "",
      ]),
    );
    return { ok: true, csv, count: shifts.length };
  } catch (err) {
    console.error("exportShiftsCsv failed:", err);
    return { ok: false, error: "Couldn't export — a table may not be set up yet." };
  }
}

// Export the incident register as CSV.
export async function exportIncidentsCsv(input?: { status?: string }): Promise<CsvResult> {
  const worker = await requireOversight();
  if (!worker) return { ok: false, error: "You don't have permission to export." };
  try {
    const items = await prisma.incident.findMany({
      where: { organisationId: worker.organisationId!, ...(input?.status ? { status: input.status } : {}) },
      orderBy: { occurredAt: "desc" },
      take: 5000,
    });
    const csv = toCsv(
      ["IncidentId", "OccurredAt", "Type", "Severity", "Reportable", "Status", "Description"],
      items.map((i) => [
        i.id, i.occurredAt.toISOString(), i.type, i.severity,
        i.reportable ? "yes" : "no", i.status, i.description,
      ]),
    );
    return { ok: true, csv, count: items.length };
  } catch (err) {
    console.error("exportIncidentsCsv failed:", err);
    return { ok: false, error: "Couldn't export — the incident table may not be set up yet." };
  }
}
