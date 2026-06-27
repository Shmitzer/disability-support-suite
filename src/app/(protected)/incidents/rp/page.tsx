// Restrictive-Practice (RP) incident capture — tablet / shared hub iPad.
// Server component: reads who's on shift + a participant in context + the eMAR
// meds for chemical-restraint picks, then hands the calm "quick tap | dictate"
// capture flow to the client. Matches docs/design/Caira RP Incident.dc.html.
//
// All actions are mocks-friendly: reportIncident persists; everything else is
// local capture state. Dummy data only — no PII to external APIs.

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { tenantScope } from "@/lib/tenant";
import { listMedications } from "@/lib/medication-actions";
import CairaEmpty from "@/components/caira/CairaEmpty";
import RpIncidentClient, { type EmarMed } from "./RpIncidentClient";

export const dynamic = "force-dynamic";

export default async function RpIncidentPage() {
  const worker = await getCurrentUser();

  if (!worker) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16">
        <CairaEmpty
          message="No worker found"
          submessage="Run the seed script to add sample data."
        />
      </main>
    );
  }

  // The participant in context. On the shared hub this is the person whose
  // record the worker is on — here we take the first participant in scope.
  const participant = await prisma.participant.findFirst({
    where: tenantScope(worker),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const org = worker.organisationId
    ? await prisma.organisation.findUnique({
        where: { id: worker.organisationId },
        select: { name: true },
      })
    : null;

  // Chemical-restraint drug/dose picks come from the eMAR. Each carries its
  // administration id so the same dose isn't recorded twice. If there's no
  // chart yet, fall back to a small sample set (dummy data only).
  const meds = participant ? await listMedications(participant.id) : [];
  const emar: EmarMed[] = meds.length
    ? meds.slice(0, 5).map((m) => ({
        medicationId: m.id,
        name: m.name,
        dose: m.dose ?? "—",
        kind: m.prn ? "PRN" : "Routine",
        time: "—",
        adminId: `MA-${m.id.slice(-4).toUpperCase()}`,
      }))
    : [
        { medicationId: "sample-1", name: "Lorazepam", dose: "1 mg", kind: "PRN", time: "14:20", adminId: "MA-2291" },
        { medicationId: "sample-2", name: "Diazepam", dose: "5 mg", kind: "PRN", time: "—", adminId: "MA-2290" },
        { medicationId: "sample-3", name: "Risperidone", dose: "0.5 mg", kind: "Routine", time: "08:00", adminId: "MA-2284" },
      ];

  return (
    <RpIncidentClient
      participantId={participant?.id ?? null}
      participantName={participant?.name ?? "Zef"}
      workerName={worker.name}
      orgName={org?.name ?? "Northern Life Support"}
      emar={emar}
      // Tweaks (design props). reportingWindowHours is NOT legally settled —
      // a placeholder until the lawyer + BSP practitioner confirm.
      bspReference="BSP-0417"
      bspAuthorisedPractices={["Physical restraint", "Chemical restraint"]}
      reportingWindowHours={24}
      initialMode="quick"
    />
  );
}
