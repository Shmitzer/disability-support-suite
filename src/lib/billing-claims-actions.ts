// billing-claims-actions.ts — #8 budget tracking + #13 billable items / claim export.
// LOGIC ONLY (cd builds the budget view + claim screen). Managed by BillingManage.
// Money is integer cents. Phase 2.4 adds the NDIS price-guide importer
// (importPriceGuide / checkClaimAgainstGuide, backed by src/lib/price-guide.ts) and
// the real NDIA bulk-upload CSV (toNdisBulkCsv); toClaimCsv stays the generic export.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { lineAmountCents, budgetSummary, toClaimCsv } from "@/lib/billing-claims";
import {
  parsePriceGuideCsv,
  priceCapCents,
  validateClaimLine,
  regionForState,
  type PriceRegion,
} from "@/lib/price-guide";
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

// --- NDIS price guide (Phase 2.4) -------------------------------------------
// Map a stored NdisSupportItem row → the per-region cents shape price-guide.ts
// reasons over, so lookup/validation share one source of truth.
type PriceGuideRow = {
  code: string;
  name: string;
  quote: boolean;
  capActNswQldVicCents: number | null;
  capNtSaTasWaCents: number | null;
  capRemoteCents: number | null;
  capVeryRemoteCents: number | null;
  capNationalCents: number | null;
};
function rowToSupportItem(r: PriceGuideRow) {
  return {
    code: r.code,
    name: r.name,
    quote: r.quote,
    priceCapsCents: {
      act_nsw_qld_vic: r.capActNswQldVicCents,
      nt_sa_tas_wa: r.capNtSaTasWaCents,
      remote: r.capRemoteCents,
      very_remote: r.capVeryRemoteCents,
      national: r.capNationalCents,
    } as Record<PriceRegion, number | null>,
  };
}

// Resolve a support item for an org: the org's private override row wins over the
// global seed (organisationId NULL). Resilient to the table not being applied yet.
async function resolveSupportItem(code: string, organisationId: string | null) {
  try {
    const rows = await prisma.ndisSupportItem.findMany({
      where: { code, OR: [{ organisationId: null }, { organisationId }] },
    });
    const override = rows.find((r) => r.organisationId === organisationId);
    const row = override ?? rows.find((r) => r.organisationId === null);
    return row ? rowToSupportItem(row as PriceGuideRow) : null;
  } catch {
    return null; // table not applied yet — degrade to "no guide"
  }
}

// Import the NDIA Support Catalogue CSV as org-private price rows (negotiated /
// current-release prices for THIS org). Global seeds are loaded by ops, not here.
// Upserts by (code, organisationId). BillingManage-gated + audited.
export async function importPriceGuide(input: {
  csv: string;
  priceGuideVersion?: string;
}): Promise<{ ok: boolean; error?: string; imported?: number }> {
  const worker = await getCurrentWorker();
  if (!worker?.organisationId) return { ok: false, error: "Not signed in." };
  if (!(await requireBilling(worker.organisationId))) {
    return { ok: false, error: "You don't have permission to import the price guide." };
  }
  const items = parsePriceGuideCsv(input.csv);
  if (items.length === 0) return { ok: false, error: "No support items found in that file." };
  try {
    for (const it of items) {
      const data = {
        code: it.code,
        name: it.name,
        registrationGroup: it.registrationGroup ?? null,
        supportCategory: it.supportCategory ?? null,
        unit: it.unit ?? null,
        typeOfSupport: it.type ?? null,
        quote: it.quote,
        capActNswQldVicCents: it.priceCapsCents.act_nsw_qld_vic ?? null,
        capNtSaTasWaCents: it.priceCapsCents.nt_sa_tas_wa ?? null,
        capRemoteCents: it.priceCapsCents.remote ?? null,
        capVeryRemoteCents: it.priceCapsCents.very_remote ?? null,
        capNationalCents: it.priceCapsCents.national ?? null,
        priceGuideVersion: input.priceGuideVersion ?? null,
        organisationId: worker.organisationId,
        userId: worker.supabaseUserId ?? worker.id, // owner uid (RLS auth.uid()), Rule 5/E
      };
      await prisma.ndisSupportItem.upsert({
        where: { code_organisationId: { code: it.code, organisationId: worker.organisationId } },
        update: data,
        create: data,
      });
    }
    await recordAudit({
      action: "PRICE_GUIDE_IMPORTED",
      targetType: "Organisation",
      targetId: worker.organisationId,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { imported: items.length, version: input.priceGuideVersion ?? null },
    });
    return { ok: true, imported: items.length };
  } catch (err) {
    console.error("importPriceGuide failed:", err);
    return { ok: false, error: "Couldn't import — the price-guide table may not be set up yet." };
  }
}

// Validate a proposed claim line against the price guide for a region (state code
// or explicit region). Warn-don't-block: returns the cap + whether it's over.
export async function checkClaimAgainstGuide(input: {
  code: string;
  unitPriceCents: number;
  stateOrRegion?: string;
}): Promise<{ ok: boolean; capCents: number | null; reason?: string; overByCents?: number }> {
  const worker = await getCurrentWorker();
  if (!worker?.organisationId) return { ok: false, capCents: null, reason: "not_signed_in" };
  const region: PriceRegion = (
    ["act_nsw_qld_vic", "nt_sa_tas_wa", "remote", "very_remote", "national"] as PriceRegion[]
  ).includes(input.stateOrRegion as PriceRegion)
    ? (input.stateOrRegion as PriceRegion)
    : regionForState(input.stateOrRegion ?? "");
  const item = await resolveSupportItem(input.code, worker.organisationId);
  const check = validateClaimLine(item ?? undefined, region, input.unitPriceCents);
  return {
    ok: check.ok,
    capCents: check.capCents ?? (item ? priceCapCents(item, region) : null),
    reason: check.reason,
    overByCents: check.overByCents,
  };
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
    // tenant-ok: `items` were fetched above scoped to worker.organisationId, so
    // this id-set is already org-bounded (marks just-exported drafts CLAIMED).
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
