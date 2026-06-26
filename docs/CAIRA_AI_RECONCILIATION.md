# Caira AI — reconciling the two "brains"

There are **two independently-designed Caira AI helpers**. Both must become **one brain** before
Step 3 (AI Brain) is built, or the repo ends up with two competing implementations. This is the
merge plan.

## The two designs

**Layer 1 — "Caira assistant / your friend" (already built, in repo)**
`docs/caira-assistant.md` · `src/lib/assistant-actions.ts` (`askAssistant`) ·
`assistant-retrieval.ts` (`topContext`, keyword rank) · `document-actions.ts` · `chunk-text.ts` ·
models `AssistantContext` / `AssistantMessage` / `Document`.
- **Retrieval-grounded:** answers from a per-user context store (uploads, notes, learned facts), access-scoped per participant, PII scrubbed→restored.
- Goes through the **one AI seam** `src/lib/ai.ts` → `ai.askCaira({question, context, people})` (Rule 1).
- One warm plain-English persona; facts only from context; no medical/legal/financial advice.
- STT = existing `transcribeAudio` (`/api/transcribe`); TTS = browser `SpeechSynthesis`.

**Layer 2 — "Caira AI Brain" (Drive handover, not yet built)**
`lib/caira/systemPrompts.ts` (`workerPrompt`/`participantSimplePrompt`/`supervisorPrompt`) ·
`app/api/caira/route.ts` · models `CairaFlag`, `participantAILevel`.
- **Role-based:** 3 personas (Worker / Participant-simple / Supervisor), adjustable complexity.
- **Live-context injected:** shift events, today's schedule, current screen pushed into the prompt.
- **Calls Gemini directly** in the route (⚠ bypasses `ai.ts` — breaks Rule 1).
- **Net-new safety system:** distressing participant messages → `CairaFlag` → quiet antenna flag for the worker.
- STT = Web Speech API (en-AU) in the recording overlay; wires into the Character-System overlay UI.

## The conflicts
1. **AI seam (Rule 1).** Layer 2's `route.ts` calls Gemini directly. **Must** route through `src/lib/ai.ts`.
2. **Two answer functions.** `ai.askCaira` (RAG, 1 persona) vs the 3 role prompts. They overlap.
3. **Two context strategies.** Layer 1 = retrieved store (long-term memory). Layer 2 = live injected context (the now). Both are needed; neither alone is enough.
4. **Two entry points.** Layer 1 = `askAssistant` server action. Layer 2 = `/api/caira` route. Pick one.
5. **Transcription.** Don't build a third path — the shift capture already reconciled Web Speech (live) + Gemini `/api/transcribe` (batch fallback). Reuse it.
6. **Draft review.** Layer 2's "post-recording draft review" = the existing note **extract → review → confirm** flow (`note-extraction.ts` + `log-actions.ts`). Reuse, don't rebuild.

## Target: ONE Caira brain

> **Role-aware personas (Layer 2) wrapped around the retrieval-augmented, seam-routed engine (Layer 1), through one entry point, reusing the existing transcription + note-review flows, plus Layer 2's safety-flag system wired into audit + notifications.**

### Keep
- Layer 1 entirely: the context store (`AssistantContext`/`Document`), `topContext` retrieval, access-scoping, PII scrub, ingestion/OCR, `AssistantMessage` history, browser TTS.
- Layer 2's **net-new** pieces: the **3 role personas**, `participantAILevel`, the **`CairaFlag` safety system**, the Character-System **overlay UI**, and the Step-4 web-access guardrail (`webEnabled`, participants always false).

### Merge
- **Persona into the seam.** Move `systemPrompts.ts` behind `ai.ts`: add `ai.askCaira({ role, message, retrievedContext, liveContext, people, webEnabled })`. The role picks the system prompt; the body still injects **both** the retrieved store snippets **and** the live shift/screen context; keep Layer 1's hard rules (facts-only-from-context, no medical/legal/financial advice, PII scrub) in every persona.
- **One entry point.** Make `/api/caira/route.ts` the single front door for the overlay; internally it calls the existing retrieval + access-scoping (the guts of `askAssistant`) → `ai.askCaira(...)` → persists `AssistantMessage` → runs safety detection. Refactor `askAssistant` to share that core (or have it call the same internal fn) so there aren't two divergent pipelines.
- **Safety flag → existing systems.** `CairaFlag` creation should also `recordAudit(...)` and raise a `Notification` to the assigned worker/supervisor (reuse the built notification + audit layers, don't invent a parallel one).

### Drop / avoid
- Direct `model.generateContent` in `route.ts` (use the seam).
- A second transcription path and a second draft-review flow (reuse existing).
- A second "persona" notion in `ai.askCaira` vs `systemPrompts` — there should be exactly one persona source of truth (the role prompts), consumed by the seam.

## Build checklist (do this when Step 3 runs)
1. Add `role` + `liveContext` + `webEnabled` params to `ai.askCaira`; fold the 3 role prompts in behind the seam.
2. Create `/api/caira/route.ts` as the single entry: auth → retrieve (`topContext`, access-scoped) + assemble live context → `ai.askCaira` → persist → safety scan.
3. Refactor `assistant-actions.askAssistant` to call that shared core (no divergence).
4. Add `CairaFlag` + `participantAILevel` to schema (+ `prisma/sql`), wire flag → `recordAudit` + `Notification`.
5. Reuse `audio.ts`/Web-Speech for STT and `note-extraction` for the draft-review flow.
6. Keep Step 4 web-access as the conditional `googleSearch` tool in the seam; participants hard-locked to `false` in ≥2 places.
7. Tests: persona selection, access-scoped retrieval, participant-always-no-web, safety-flag creation. `tsc`/`lint`/`build` green.

## Net
Two names, one brain: the **role personas are the voice**, the **context store is the memory**, the
**`ai.ts` seam is the single mouth**, and the **safety flag + audit + notifications** are the
guardrails. Build Step 3 against this doc, not the handover in isolation.
