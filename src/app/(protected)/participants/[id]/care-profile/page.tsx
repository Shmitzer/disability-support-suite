// /participants/[id]/care-profile — edit a participant's care profile (condition tags
// + support-need flags) that tailor their capture chips. Coordinator/clinical only
// (Capability.CareProfileManage); the save action re-checks server-side.

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/tenant";
import { can, Capability } from "@/lib/rbac";
import { getCareProfile } from "@/lib/care-profile";
import { CareProfileEditor } from "@/components/CareProfileEditor";

export const dynamic = "force-dynamic";

export default async function CareProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const worker = await getCurrentUser();
  if (!worker) notFound();
  // Authorization by capability — never compare roles directly.
  if (!can(worker.role, Capability.CareProfileManage)) notFound();

  // Tenant-scoped: only a participant in the caller's org.
  const participant = await prisma.participant.findFirst({
    where: { id, ...tenantScope(worker) },
    select: { id: true, name: true },
  });
  if (!participant) notFound();

  const profile = await getCareProfile(participant.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <CareProfileEditor
        participantId={participant.id}
        participantName={participant.name}
        initialConditions={profile?.conditions ?? []}
        initialNeeds={profile?.supportNeeds ?? []}
      />
    </main>
  );
}
