// Incidents register (phone) — worker surface.
// Server component: reads the live org incident register and the participant
// list (for context), then hands a plain-data snapshot to the client flow.
// Design source of truth: docs/design/Caira Incidents.dc.html.

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { listOrgIncidents } from "@/lib/incident-actions";
import { tenantScope } from "@/lib/tenant";
import IncidentsClient, { type IncidentRow, type ParticipantOption } from "./IncidentsClient";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

// Backend stores type/severity as enums; the design speaks in plain language.
// Map both ways so the register reads naturally and saves valid values.
const TYPE_LABELS: Record<string, string> = {
  physical: "Injury",
  behavioural: "Behaviour",
  medical: "Medication",
  environmental: "Environmental",
  other: "Other",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "No harm",
  medium: "Minor",
  high: "Moderate",
  critical: "Serious",
};

function statusKey(status: string, reportable: boolean): IncidentRow["status"] {
  if (reportable) return "reportable";
  if (status === "OPEN") return "open";
  return "recorded";
}

function formatWhen(d: Date): string {
  const now = new Date();
  const time = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

export default async function IncidentsPage() {
  const worker = await getCurrentUser();

  // The live register (oversight-scoped; returns [] gracefully if not permitted
  // or the table isn't set up yet).
  const incidents = await listOrgIncidents().catch(() => []);

  // Participant names for the picker / row context. Best-effort.
  let participants: ParticipantOption[] = [];
  try {
    if (worker) {
      participants = await prisma.participant.findMany({
        where: tenantScope(worker),
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    }
  } catch {
    participants = [];
  }

  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  const rows: IncidentRow[] = incidents.map((i) => {
    const typeLabel = TYPE_LABELS[i.type] ?? "Other";
    const sevLabel = SEVERITY_LABELS[i.severity] ?? i.severity;
    const reportable = Boolean(i.reportable);
    const occurredAt = i.occurredAt instanceof Date ? i.occurredAt : new Date(i.occurredAt);
    const ref = `INC-${occurredAt.getFullYear()}-${i.id.slice(-4).toUpperCase()}`;
    const who = i.participantId ? nameById.get(i.participantId) ?? null : null;
    return {
      id: i.id,
      type: typeLabel,
      severity: sevLabel,
      title: typeLabel + (who ? ` · ${who}` : ""),
      time: formatWhen(occurredAt),
      by: worker?.name ?? "Support worker",
      status: statusKey(i.status, reportable),
      reportable,
      ref,
      summary: i.description,
    };
  });

  const firstParticipant = participants[0]?.name ?? "this participant";

  return (
    <IncidentsClient
      incidents={rows}
      participants={participants}
      participantName={firstParticipant}
      reportingWindowHours={24}
    />
  );
}
