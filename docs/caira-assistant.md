# Caira Assistant — "your friend" (architecture + phases)

A per-user AI assistant ("Caira") that answers questions about the **NDIS**, the
**participants** the user supports, the **company**, and **general** topics — grounded
in a per-user **context store** (their docs + facts learned as they use the app), and
designed for **voice in / voice out** (accessibility-first).

Constraints honoured: all LLM calls go through the one AI seam (`src/lib/ai.ts`, Rule 1);
PII is scrubbed before any model call (Rule 2); person/org facts are access-scoped;
nothing here is layout/design (cd owns the voice button, the conversation UI, and audio
playback).

---

## Data model (`prisma/sql/assistant.sql`, NOT auto-applied)
- **AssistantContext** — per-user retrievable snippets. `userId` (owner), `source`
  (`upload` | `note` | `learned` | `profile` | `manual`), `content`, optional
  `participantId` (scopes a snippet to one person), `metadata`.
- **AssistantMessage** — conversation history (also the raw material for learning).

## Request path (built, v1)
1. **STT** — voice → text via the existing `transcribeAudio` (`/api/transcribe`).
2. **Retrieve** — `assistant-actions.askAssistant(question)`:
   - loads the user's `AssistantContext` (owner-scoped),
   - drops participant snippets the user can no longer access (WorkerParticipant link /
     allocated shift / org `ShiftReadOrg` / active grant),
   - ranks with `assistant-retrieval.topContext` (keyword scoring, pure + tested).
3. **Ask** — `ai.askCaira({ question, context, people })`: warm plain-English persona;
   person/org facts ONLY from context (else "I don't have that"); no medical/legal/
   financial advice as fact; spoken-friendly; PII scrubbed→restored.
4. **Persist** — store the user + assistant messages (history + learning material).
5. **TTS (audio response)** — browser `SpeechSynthesis` in the UI (cd) — free, offline,
   accessible. (A server TTS provider is a later option if higher-quality voices are wanted.)

## Learning
- `rememberForAssistant({content, participantId?, source})` — explicit "remember this"
  + the hook derived facts use. Conversation history accumulates in AssistantMessage.
- Later: derive context from approved notes / care profile / org docs (ingestion jobs).

## Phases
- **v1 (done — logic):** store + keyword retrieval + `askCaira` + ask/remember actions
  + history. cd wires the voice button + audio playback.
- **v3 document ingestion (done — logic):** `Document` model + `document-actions.ts`.
  Sources: **provider-attached docs, worker/manager/admin note attachments, third-party
  uploads, personal uploads, and photographed docs** (OCR via `ai.extractTextFromImage`
  → text → save). `addDocument` (upload and/or text) and `photoToDocument` (photo→OCR→
  save) auto-ingest: `chunkText` splits the text into `AssistantContext` rows the
  assistant draws on. Files → Supabase Storage relative paths (Rule 3); participant
  docs gated by `canAccessParticipant`. cd builds the upload + camera UI.
- **Photos**: stored as `Document`s (image mimeType); the photo→text path is built. Plain
  photo storage (no OCR) also works via `addDocument` with a `dataUrl`.
- **TTS**: **browser SpeechSynthesis first** (cd wires it); a server TTS provider is a
  later option.
- **v2 — semantic retrieval (LATER):** embeddings + pgvector for better recall; swap
  behind the `topContext` interface (no call-site changes). Start with a **cheap
  embeddings API** when we do it. Deferred for now (keyword retrieval ships).
- **v4 — proactive learning:** derive context from notes/care profiles/usage patterns.

## Privacy / compliance (gates)
- Person/org facts are access-scoped at retrieval; PII scrubbed before the model.
- This is "AI processing of care data" — covered by the legal items in
  `docs/pre-launch-doc-checklist.md` (privacy policy AI disclosure, consent). The
  in-page AI disclaimer (`notices.ts` → `Notice.AiReview`) applies to assistant answers too.
- No real participant data until the gate is met (hard rule). Works on dummy data now.

## Ownership split
- **CC (logic):** store, retrieval, `askCaira`, actions, history, scoping, future
  embeddings/ingestion jobs.
- **cd (UI):** the voice mic button, conversation/answer display, audio playback
  (SpeechSynthesis), the "remember this" affordance.
- **Decisions for Edward:** embeddings provider (v2), document source (v3), whether to
  use server TTS vs browser TTS.
