// POST /api/caira — the role-based Caira chat endpoint.
//
// Picks a persona from the caller's role, gathers live tenant-scoped context, builds
// the matching system prompt, and calls Gemini (no tools unless the user has been
// granted web access). Participant messages get a safety pre-check that can quietly
// raise a CairaFlag for the assigned worker.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { checkRateLimit, checkSpendCap } from "@/lib/rate-limit";
import { cairaChat, generateProgressNote, type GeminiTurn } from "@/lib/ai";
import { cairaPersona, webAccessAllowedForRole } from "@/lib/caira/roles";
import { quickSafetyCheck, stripSafetyJson } from "@/lib/caira/safetyDetect";
import {
  workerPrompt,
  participantSimplePrompt,
  participantAdjustedPrompt,
  supervisorPrompt,
} from "@/lib/caira/systemPrompts";
import {
  buildWorkerContext,
  buildParticipantContext,
  buildSupervisorContext,
  findAssignedWorkerId,
} from "@/lib/caira/context";

const GENERIC_ERROR = "I'm having trouble right now. Please try again.";

export async function POST(request: Request) {
  const worker = await getCurrentWorker();
  if (!worker) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Throttle per user (no-op until Upstash is configured).
  const rl = await checkRateLimit(`caira:${worker.id}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { reply: "You've sent a lot of messages — give me a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // Global daily LLM spend cap — Caira's Gemini calls (chat + voice-note below) must
  // count against the same ceiling as /api/generate-note and /api/transcribe, so this
  // path can't be used to bypass the budget. No-op until Upstash is configured.
  const cap = await checkSpendCap();
  if (!cap.allowed) {
    return NextResponse.json(
      { reply: "Caira's having a busy day and is resting to keep costs in check. Please try again later." },
      { status: 503 },
    );
  }

  let payload: {
    message?: string;
    history?: GeminiTurn[];
    currentScreen?: string;
    isVoiceNote?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const message = (payload.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }
  const history = Array.isArray(payload.history) ? payload.history : [];
  const currentScreen = payload.currentScreen?.trim() || "the app";
  const persona = cairaPersona(worker.role);

  // WEB ACCESS HARD GUARDRAIL: never trust the DB value alone for participants — a
  // participant is ALWAYS off, regardless of any cairaWebAccess row value. This is one
  // of three independent guardrails (Prisma default, here, and /api/admin/caira-access).
  const webEnabled =
    webAccessAllowedForRole(worker.role) &&
    (worker as { cairaWebAccess?: boolean }).cairaWebAccess === true;

  // Voice note: format a dictated transcript into a clean shift-note draft (worker).
  if (payload.isVoiceNote) {
    try {
      const ctx = await buildWorkerContext(worker);
      const reply = await generateProgressNote({
        participantName: ctx.participantName,
        rawNotes: message,
      });
      return NextResponse.json({ reply, webEnabled });
    } catch (err) {
      console.error("Caira voice-note formatting failed:", err);
      return NextResponse.json({ reply: GENERIC_ERROR }, { status: 500 });
    }
  }

  // PARTICIPANT SAFETY PRE-CHECK — write a flag, but still let Gemini give the warm
  // redirect (defined in the participant system prompt). A flag-write failure must
  // never break the participant's chat (their experience comes first).
  let safetyFlagged = false;
  if (persona === "participant") {
    const check = quickSafetyCheck(message);
    if (check.flagged) {
      safetyFlagged = true;
      try {
        const route = await findAssignedWorkerId(worker);
        await prisma.cairaFlag.create({
          data: {
            participantId: route.participantId ?? worker.id,
            participantName: worker.name,
            triggerMessage: message,
            flagReason: check.reason,
            workerId: route.workerId,
            shiftId: route.shiftId,
            organisationId: worker.organisationId,
          },
        });
      } catch (err) {
        // Do NOT fail the request — log and continue (handover requirement).
        console.error("CairaFlag write failed:", err);
      }
    }
  }

  // Build the system prompt for this persona, with live context injected. We also
  // collect the real person-names in scope so cairaChat can scrub them (Rule 2) from
  // everything sent to Gemini and restore them in the reply.
  let systemPrompt: string;
  let maxOutputTokens = 400;
  let temperature = 0.4;
  const names: string[] = [worker.name];
  try {
    if (persona === "participant") {
      const ctx = await buildParticipantContext(worker);
      const build = ctx.aiLevel === "adjusted" ? participantAdjustedPrompt : participantSimplePrompt;
      systemPrompt = build({
        participantName: ctx.participantName,
        workerName: ctx.workerName,
        todaySchedule: ctx.todaySchedule,
        currentScreen,
      });
      names.push(ctx.participantName, ctx.workerName);
      temperature = 0.3;
    } else if (persona === "supervisor") {
      const ctx = await buildSupervisorContext(worker);
      systemPrompt = supervisorPrompt({
        supervisorName: worker.name,
        orgName: ctx.orgName,
        activeShiftsToday: ctx.activeShiftsToday,
        openFlags: ctx.openFlags,
        currentScreen,
        webEnabled,
      });
      maxOutputTokens = 600;
    } else {
      const ctx = await buildWorkerContext(worker);
      systemPrompt = workerPrompt({
        workerName: worker.name,
        participantName: ctx.participantName,
        shiftStartTime: ctx.shiftStartTime,
        eventsLoggedToday: ctx.eventsLoggedToday,
        currentScreen,
        webEnabled,
      });
      names.push(ctx.participantName);
    }
  } catch (err) {
    console.error("Caira context/prompt build failed:", err);
    return NextResponse.json({ reply: GENERIC_ERROR, safetyFlagged }, { status: 500 });
  }

  // Call Gemini.
  try {
    // Drop the context builders' generic placeholders ("your participant", etc.) and the
    // default display name — scrubbing those would tokenise common words in the prompt.
    // Only real person-names get tokenised (matching the other scrubPII call sites).
    const GENERIC_NAMES = new Set(["your participant", "your support worker", "friend", "new worker"]);
    const scrubNames = names.filter((n) => {
      const t = (n ?? "").trim().toLowerCase();
      return t.length > 0 && !GENERIC_NAMES.has(t);
    });

    let reply = await cairaChat({
      systemPrompt,
      history,
      message,
      webEnabled,
      maxOutputTokens,
      temperature,
      names: scrubNames,
    });

    // The participant prompt asks the model to append a {"safetyFlag":…} object. Parse
    // it (as a second signal alongside the keyword pre-check) then strip it so the
    // participant only ever sees the warm, plain-text reply — never raw JSON.
    if (persona === "participant") {
      const { cleaned, flagged } = stripSafetyJson(reply);
      reply = cleaned;
      if (flagged) safetyFlagged = true;
    }

    return NextResponse.json({
      reply: reply || "Sorry, I didn't catch that — could you say it another way?",
      ...(safetyFlagged ? { safetyFlagged: true } : {}),
      webEnabled,
    });
  } catch (err) {
    console.error("Caira chat failed:", err);
    return NextResponse.json({ reply: GENERIC_ERROR, safetyFlagged, webEnabled }, { status: 500 });
  }
}
