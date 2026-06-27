// eMAR-lite (phone) — medication record, worker surface.
// Server component: resolves the participant (first accessible, or ?participantId=),
// reads the live medication chart + today's administrations, computes the
// due-now / later-today / done buckets, and hands a plain-data snapshot to the
// client flow. Design source of truth: docs/design/Caira eMAR.dc.html.

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { tenantScope } from "@/lib/tenant";
import { listMedications, listAdministrations } from "@/lib/medication-actions";
import EmarClient, { type MedRow } from "./EmarClient";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

// A medication's clinical fields can be null in the chart; the design always
// shows something, so we coalesce on the way through.
type ChartMed = {
  id: string;
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  scheduleTimes: unknown;
  prn: boolean;
  prnProtocol: string | null;
  notes: string | null;
};

type AdminRec = {
  id: string;
  medicationId: string;
  status: string;
  note: string | null;
  administeredAt: Date | string;
  scheduledAt: Date | string | null;
};

// A small dummy chart so the screen always renders even before a real chart
// exists (mirrors the .dc.html prototype meds). Dummy data only — no PII.
const DUMMY_MEDS: ChartMed[] = [
  { id: "d-risperidone", name: "Risperidone", dose: "0.5 mg", route: "Oral tablet", frequency: "Mane", scheduleTimes: ["08:00"], prn: false, prnProtocol: null, notes: null },
  { id: "d-paracetamol", name: "Paracetamol", dose: "500 mg", route: "Oral tablet", frequency: "Midday", scheduleTimes: ["12:30"], prn: false, prnProtocol: null, notes: null },
  { id: "d-levetiracetam", name: "Levetiracetam", dose: "500 mg", route: "Oral tablet", frequency: "Nocte", scheduleTimes: ["20:00"], prn: false, prnProtocol: null, notes: null },
  { id: "d-macrogol", name: "Macrogol", dose: "1 sachet", route: "Oral", frequency: "Nocte", scheduleTimes: ["20:00"], prn: false, prnProtocol: null, notes: null },
  { id: "d-lorazepam", name: "Lorazepam", dose: "1 mg", route: "Oral", frequency: null, scheduleTimes: [], prn: true, prnProtocol: "Behaviour · chemical restraint", notes: "chemical restraint" },
  { id: "d-paracetamol-prn", name: "Paracetamol", dose: "500 mg", route: "Oral", frequency: null, scheduleTimes: [], prn: true, prnProtocol: "Pain · max 4 in 24h", notes: null },
];

// Chemical-restraint detection: a PRN whose protocol/notes flag it, or one of a
// short list of known chemical-restraint agents. Drives the RP cross-reference.
const RESTRAINT_AGENTS = ["lorazepam", "diazepam", "olanzapine", "haloperidol", "midazolam"];
function isChemicalRestraint(m: ChartMed): boolean {
  const hay = `${m.prnProtocol ?? ""} ${m.notes ?? ""}`.toLowerCase();
  if (hay.includes("chemical restraint") || hay.includes("restrict")) return true;
  return m.prn && RESTRAINT_AGENTS.some((a) => m.name.toLowerCase().includes(a));
}

function toTimes(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// A scheduled dose is "due now" if its time has passed (or is within the next
// 30 min) and it hasn't been recorded today; otherwise it's "later today".
const DUE_LOOKAHEAD_MIN = 30;

export default async function EmarPage({
  searchParams,
}: {
  searchParams?: Promise<{ participantId?: string }>;
}) {
  const worker = await getCurrentUser();
  const sp = (await searchParams) ?? {};

  // Resolve the participant: the requested one (if accessible) else the first
  // in the worker's tenant. Best-effort — the screen still renders without one.
  let participant: { id: string; name: string } | null = null;
  try {
    if (worker) {
      const where = sp.participantId
        ? { AND: [tenantScope(worker), { id: sp.participantId }] }
        : tenantScope(worker);
      participant = await prisma.participant.findFirst({
        where,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    }
  } catch {
    participant = null;
  }

  // The live chart + today's administrations (both access-checked in the
  // actions). Fall back to the dummy chart if there's no real chart yet.
  let chart: ChartMed[] = [];
  let admins: AdminRec[] = [];
  if (participant) {
    chart = (await listMedications(participant.id).catch(() => [])) as ChartMed[];
    admins = (await listAdministrations(participant.id, 200).catch(() => [])) as AdminRec[];
  }
  const usingDummy = chart.length === 0;
  if (usingDummy) chart = DUMMY_MEDS;

  // Today's administrations only, newest first, keyed by medication.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayAdmins = admins.filter((a) => {
    const at = a.administeredAt instanceof Date ? a.administeredAt : new Date(a.administeredAt);
    return at >= startOfDay;
  });
  const latestByMed = new Map<string, AdminRec>();
  for (const a of todayAdmins) {
    if (!latestByMed.has(a.medicationId)) latestByMed.set(a.medicationId, a);
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const workerName = worker?.name ?? "You";

  const rows: MedRow[] = [];

  for (const m of chart) {
    const base = {
      id: m.id,
      name: m.name,
      dose: m.dose ?? "",
      route: m.route ?? "",
      restraint: isChemicalRestraint(m),
    };

    if (m.prn) {
      const rec = latestByMed.get(m.id);
      rows.push({
        ...base,
        group: "prn",
        time: null,
        sub: m.prnProtocol ?? m.frequency ?? "As needed",
        status: rec ? statusToUi(rec.status) : null,
        by: rec ? workerName : null,
        at: rec ? hhmm(toDate(rec.administeredAt)) : null,
        reason: rec?.note ?? null,
      });
      continue;
    }

    const times = toTimes(m.scheduleTimes);
    const dosesToday = times.length ? times : [null];
    for (const t of dosesToday) {
      // One row per scheduled time. We only track a single "today" record per
      // medication, so the most recent admin satisfies the nearest-due dose.
      const rec = latestByMed.get(m.id);
      const tMin = t ? toMinutes(t) : null;
      const isDone = !!rec;
      let group: MedRow["group"] = "later";
      if (isDone) {
        group = "done";
      } else if (tMin === null || tMin <= nowMin + DUE_LOOKAHEAD_MIN) {
        group = "due";
      }
      rows.push({
        ...base,
        group,
        time: t,
        sub: m.route ?? "",
        status: rec ? statusToUi(rec.status) : null,
        by: rec ? workerName : null,
        at: rec ? hhmm(toDate(rec.administeredAt)) : null,
        reason: rec?.note ?? null,
      });
      // Only the first scheduled dose can be due/done in this lite model; the
      // rest are shown as "later".
      if (!isDone && group === "due") break;
    }
  }

  const today = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });

  return (
    <EmarClient
      participantName={participant?.name ?? "this participant"}
      participantId={participant?.id ?? null}
      today={today}
      meds={rows}
      usingDummy={usingDummy}
    />
  );
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function statusToUi(status: string): MedRow["status"] {
  switch (status) {
    case "GIVEN":
    case "PRN_GIVEN":
      return "given";
    case "WITHHELD":
      return "withheld";
    case "REFUSED":
      return "refused";
    default:
      return "given";
  }
}
