// billing-claims-actions.ts — #8 budget tracking + #13 billable items / claim export.
// LOGIC ONLY (cd builds the budget view + claim screen). Managed by BillingManage.
// Money is integer cents. NDIS price-guide feed is out of scope here (codes/prices are
// entered/supplied); the claim export is a generic CSV (template mapping later).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { lineAmountCents, budgetSummary, toClaimCsv } from "@/lib/billing-claims";
import { revalidatePath } from "next/cache";

async function requireBilling(organisationId: string | null) {
  const worker = await getCurrentWorker();
  if (!worker) return null;
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.BillingManage, { organisationId })) return null;
  return worker;
}

// Set/replace a participant's budget allocation for a category.
export async function setParticipantBudget(input: {
  participantId: string;
  category: string;
  allocatedCents: number;
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const participant = await prisma.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };
  const worker = await requireBilling(participant.organisationId);
  if (!worker) return { ok: false, error: "You don't have permission to manage budgets." };
  try {
    await prisma.participantBudget.create({
      data: {
        participantId: participant.id,
        organisationId: participant.organisationId,
        category: input.category,
        allocatedCents: Math.max(0, Math.round(input.allocatedCents)),
        periodStart: input.periodStart ? new Date(input.periodStart) : null,
        periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
        createdById: worker.id,
      },
    });
    revalidatePath(`/participants/${participant.id}`);
    return { ok: true };
  } catch (err) {
    console.error("setParticipantBudget failed:", err);
    return { ok: false, error: "Couldn't save — the budget table may not be set up yet." };
  }
}

// Record a billable line item (e.g. for a delivered shift).
export async function recordBillable(input: {
  participantId: string;
  shiftId?: string | null;
  category?: string;
  lineItemCode?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  date?: string | null;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const participant = await prisma.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return { ok: false, error: "Participant not found." };
  const worker = await requireBilling(participant.organisationId);
  if (!worker) return { ok: false, error: "You don't have permission to record billing." };
  if (!input.description?.trim()) return { ok: false, error: "A description is required." };
  const amountCents = lineAmountCents(input.quantity, input.unitPriceCents);
  try {
    const item = await prisma.billableItem.create({
      data: {
        participantId: participant.id,
        shiftId: input.shiftId ?? null,
        organisationId: participant.organisationId,
        category: input.category ?? null,
        lineItemCode: input.lineItemCode ?? null,
        description: input.description.trim(),
        quantity: Math.max(0, Math.round(input.quantity)),
        unitPriceCents: Math.max(0, Math.round(input.unitPriceCents)),
        amountCents,
        date: input.date ? new Date(input.date) : new Date(),
        status: "DRAFT",
        createdById: worker.id,
      },
    });
    return { ok: true, id: item.id };
  } catch (err) {
    console.error("recordBillable failed:", err);
    return { ok: false, error: "Couldn't save — the billing table may not be set up yet." };
  }
}

// Budget allocated vs spent per category for a participant.
export async function participantBudgetSummary(participantId: string) {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { id: true, organisationId: true },
  });
  if (!participant) return null;
  if (!(await requireBilling(participant.organisationId))) return null;
  try {
    const [budgets, spends] = await Promise.all([
      prisma.participantBudget.findMany({
        where: { participantId },
        select: { category: true, allocatedCents: true },
      }),
      prisma.billableItem.findMany({
        where: { participantId, status: { not: "REJECTED" } },
        select: { category: true, amountCents: true },
      }),
    ]);
    return budgetSummary(budgets, spends);
  } catch {
    return null;
  }
}

// Export DRAFT billable items as a claim CSV and mark them CLAIMED.
export async function exportClaims(input?: { participantId?: string; claimRef?: string }) {
  const worker = await getCurrentWorker();
  if (!worker?.organisationId) return { ok: false as const, error: "Not signed in." };
  const principal = await getCurrentPrincipal();
  if (!principal || !can(principal, Capability.BillingManage, { organisationId: worker.organisationId })) {
    return { ok: false as const, error: "You don't have permission to export claims." };
  }
  try {
    const items = await prisma.billableItem.findMany({
      where: {
        organisationId: worker.organisationId,
        status: "DRAFT",
        ...(input?.participantId ? { participantId: input.participantId } : {}),
      },
      orderBy: { date: "asc" },
    });
    if (items.length === 0) return { ok: true as const, csv: "", count: 0 };

    const claimRef = input?.claimRef ?? `CLAIM-${items.length}`;
    const csv = toClaimCsv(
      items.map((i) => ({
        date: i.date.toISOString(),
        lineItemCode: i.lineItemCode,
        description: i.description,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        amountCents: i.amountCents,
        claimRef,
      })),
    );
    await prisma.billableItem.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { status: "CLAIMED", claimRef },
    });
    await recordAudit({
      action: "CLAIMS_EXPORTED",
      targetType: "Organisation",
      targetId: worker.organisationId,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { count: items.length, claimRef },
    });
    return { ok: true as const, csv, count: items.length, claimRef };
  } catch (err) {
    console.error("exportClaims failed:", err);
    return { ok: false as const, error: "Couldn't export — the billing table may not be set up yet." };
  }
}
