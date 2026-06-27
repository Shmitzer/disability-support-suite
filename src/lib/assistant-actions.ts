// assistant-actions.ts — the Caira assistant request path (server). Retrieves the
// user's context (scoped to what they may see), asks Caira (the one AI seam), and
// records the exchange (which is also the "learn as they use it" raw material).
// LOGIC ONLY — the voice button + audio playback (browser SpeechSynthesis) are cd's.
//
// Access scoping: owner snippets with no participant are always the user's own;
// participant-scoped snippets are included ONLY for participants the user can still
// reach (WorkerParticipant link, an allocated shift, org ShiftReadOrg, or a grant).

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCurrentPrincipal } from "@/lib/access";
import { can, Capability } from "@/lib/rbac";
import { askCaira } from "@/lib/ai";
import { topContext } from "@/lib/assistant-retrieval";

export type AskResult = { ok: true; answer: string } | { ok: false; error: string };

// Participant ids the current user may see context about (best-effort; resilient if
// the grant/link tables aren't live yet).
async function accessibleParticipantIds(workerId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const principal = await getCurrentPrincipal();
  try {
    const links = await prisma.workerParticipant.findMany({
      where: { workerId },
      select: { participantId: true },
    });
    links.forEach((l) => ids.add(l.participantId));
  } catch {
    /* table absent */
  }
  try {
    const shifts = await prisma.shift.findMany({
      where: { allocatedToId: workerId },
      select: { participantId: true },
    });
    shifts.forEach((s) => ids.add(s.participantId));
  } catch {
    /* ignore */
  }
  // Grants (family/guardian/participant-self) the principal holds.
  principal?.grants.forEach((g) => {
    if (can(principal, Capability.NotesRead, { participantId: g.participantId })) {
      ids.add(g.participantId);
    }
  });
  return ids;
}

export async function askAssistant(question: string): Promise<AskResult> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  const q = (question ?? "").trim();
  if (!q) return { ok: false, error: "Ask me a question." };

  // Gather this user's context store (owner-scoped), then drop participant snippets
  // they can no longer access.
  let snippets: { id: string; content: string; title: string | null; participantId: string | null }[] = [];
  try {
    snippets = await prisma.assistantContext.findMany({
      where: { userId: worker.id },
      select: { id: true, content: true, title: true, participantId: true },
      take: 500,
    });
  } catch {
    /* table not applied yet — Caira still answers from general knowledge */
  }

  let allowedParticipants: Set<string> | null = null;
  if (snippets.some((s) => s.participantId)) {
    allowedParticipants = await accessibleParticipantIds(worker.id);
  }
  const visible = snippets.filter(
    (s) => !s.participantId || allowedParticipants?.has(s.participantId),
  );

  const context = topContext(q, visible).map((s) => s.content);

  // Names to scrub before the model call (Rule 2) — participants the user can see.
  let people: string[] = [];
  if (allowedParticipants && allowedParticipants.size > 0) {
    try {
      // tenant-ok: ids come from accessibleParticipantIds(worker.id) — already
      // authorization-scoped to the participants this worker may see.
      const ps = await prisma.participant.findMany({
        where: { id: { in: [...allowedParticipants] } },
        select: { name: true },
      });
      people = ps.map((p) => p.name).filter(Boolean);
    } catch {
      /* ignore */
    }
  }

  const answer = await askCaira({ question: q, context, people });

  // Record the exchange (history + learning material). Best-effort.
  try {
    await prisma.assistantMessage.createMany({
      data: [
        { userId: worker.id, organisationId: worker.organisationId, role: "user", content: q },
        { userId: worker.id, organisationId: worker.organisationId, role: "assistant", content: answer },
      ],
    });
  } catch {
    /* table not applied yet — answering still works */
  }

  return { ok: true, answer };
}

// "Learn this" — add a snippet to the user's context store (e.g. an explicit remember,
// or a derived fact). The doc-upload + note-derived ingestion are later phases.
export async function rememberForAssistant(input: {
  content: string;
  title?: string;
  participantId?: string | null;
  source?: string; // defaults to "learned"
}): Promise<{ ok: boolean; error?: string }> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };
  const content = (input.content ?? "").trim();
  if (!content) return { ok: false, error: "Nothing to remember." };
  try {
    await prisma.assistantContext.create({
      data: {
        userId: worker.id,
        organisationId: worker.organisationId,
        source: input.source ?? "learned",
        title: input.title ?? null,
        content,
        participantId: input.participantId ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("rememberForAssistant failed:", err);
    return { ok: false, error: "Couldn't save — the assistant store may not be set up yet." };
  }
}
