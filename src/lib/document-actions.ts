// document-actions.ts — store documents (provider/worker/admin attachments, third-party
// + personal uploads, photographed docs) and ingest their text into the per-user
// assistant context store. LOGIC ONLY — cd builds the upload/camera UI.
//
// Sources: provider_attached | worker_attachment | third_party_upload |
//          personal_upload | photo_capture (OCR'd via ai.extractTextFromImage).
// Files go to Supabase Storage as RELATIVE paths (Rule 3). Participant-scoped docs are
// gated by canAccessParticipant. Ingest chunks extractedText into AssistantContext.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canAccessParticipant } from "@/lib/access";
import { extractTextFromImage } from "@/lib/ai";
import { chunkText } from "@/lib/chunk-text";
import { uploadDataUrl, storageConfigured } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const SOURCES = new Set([
  "provider_attached",
  "worker_attachment",
  "third_party_upload",
  "personal_upload",
  "photo_capture",
]);

export type DocResult = { ok: true; documentId: string } | { ok: false; error: string };

// Common guard: signed in + (if participant-scoped) allowed to access that participant.
async function authorise(participantId: string | null | undefined) {
  const worker = await getCurrentUser();
  if (!worker) return { worker: null, error: "Not signed in." as const };
  if (participantId && !(await canAccessParticipant(participantId))) {
    return { worker: null, error: "You don't have access to this participant." as const };
  }
  return { worker, error: null };
}

// Add a document. Provide EITHER a `dataUrl` (uploaded to Storage) and/or `text`
// (already-extracted). If text is present the doc is READY and auto-ingested.
export async function addDocument(input: {
  source: string;
  title?: string;
  participantId?: string | null;
  dataUrl?: string; // file/image as a data: URL (cd's uploader produces this)
  mimeType?: string;
  text?: string; // pre-extracted text (e.g. a pasted/typed doc)
}): Promise<DocResult> {
  const { worker, error } = await authorise(input.participantId);
  if (!worker) return { ok: false, error };
  if (!SOURCES.has(input.source)) return { ok: false, error: "Unknown document source." };

  let filePath: string | null = null;
  if (input.dataUrl && storageConfigured()) {
    try {
      filePath = await uploadDataUrl(input.dataUrl, `documents/${worker.id}`);
    } catch (err) {
      console.error("document upload failed:", err);
      return { ok: false, error: "Couldn't store the file." };
    }
  }

  const text = input.text?.trim() || null;
  try {
    const doc = await prisma.document.create({
      data: {
        userId: worker.id,
        organisationId: worker.organisationId,
        participantId: input.participantId ?? null,
        source: input.source,
        title: input.title ?? null,
        mimeType: input.mimeType ?? null,
        filePath,
        extractedText: text,
        status: text ? "READY" : "PENDING",
      },
    });
    await recordAudit({
      action: "DOCUMENT_ADDED",
      targetType: input.participantId ? "Participant" : "Document",
      targetId: input.participantId ?? doc.id,
      actorId: worker.id,
      organisationId: worker.organisationId,
      detail: { documentId: doc.id, source: input.source },
    });
    if (text) await ingestDocument(doc.id);
    return { ok: true, documentId: doc.id };
  } catch (err) {
    console.error("addDocument failed:", err);
    return { ok: false, error: "Couldn't save — the document store may not be set up yet." };
  }
}

// Convenience: a worker / manager / admin attaches a note or a file TO a participant.
// Thin wrapper over addDocument (which authorises via canAccessParticipant, audits, and
// auto-ingests text). Used by the note/participant flows; cd supplies text and/or file.
export async function attachToParticipant(input: {
  participantId: string;
  title?: string;
  text?: string; // a typed note
  dataUrl?: string; // an attached file/image
  mimeType?: string;
  source?: string; // defaults to worker_attachment
}): Promise<DocResult> {
  if (!input.participantId) return { ok: false, error: "A participant is required." };
  if (!input.text?.trim() && !input.dataUrl) return { ok: false, error: "Add a note or a file." };
  return addDocument({
    source: input.source ?? "worker_attachment",
    title: input.title,
    participantId: input.participantId,
    text: input.text,
    dataUrl: input.dataUrl,
    mimeType: input.mimeType,
  });
}

// Photograph a document → OCR → store as a READY document and ingest its text.
export async function photoToDocument(input: {
  base64: string;
  mimeType: string; // e.g. image/jpeg
  title?: string;
  participantId?: string | null;
}): Promise<DocResult> {
  const { worker, error } = await authorise(input.participantId);
  if (!worker) return { ok: false, error };

  let text = "";
  try {
    text = await extractTextFromImage(input.base64, input.mimeType);
  } catch (err) {
    console.error("OCR failed:", err);
    return { ok: false, error: "Couldn't read text from that image." };
  }
  if (!text.trim()) return { ok: false, error: "No legible text found in the image." };

  return addDocument({
    source: "photo_capture",
    title: input.title,
    participantId: input.participantId,
    dataUrl: `data:${input.mimeType};base64,${input.base64}`,
    mimeType: input.mimeType,
    text,
  });
}

// Chunk a document's text into AssistantContext rows (the assistant can then draw on
// it). Owner-only. Idempotent-ish: marks the doc INGESTED.
export async function ingestDocument(documentId: string): Promise<{ ok: boolean; chunks?: number; error?: string }> {
  const worker = await getCurrentUser();
  if (!worker) return { ok: false, error: "Not signed in." };

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, userId: true, organisationId: true, participantId: true, title: true, extractedText: true },
  });
  if (!doc) return { ok: false, error: "Document not found." };
  if (doc.userId !== worker.id) return { ok: false, error: "Not your document." };
  if (!doc.extractedText?.trim()) return { ok: false, error: "No text to ingest." };

  const chunks = chunkText(doc.extractedText);
  try {
    await prisma.assistantContext.createMany({
      data: chunks.map((content, i) => ({
        userId: doc.userId,
        organisationId: doc.organisationId,
        source: "upload",
        title: doc.title ? `${doc.title} (${i + 1}/${chunks.length})` : null,
        content,
        participantId: doc.participantId,
        metadata: { documentId: doc.id, chunk: i },
      })),
    });
    await prisma.document.update({ where: { id: doc.id }, data: { status: "INGESTED" } });
    if (doc.participantId) revalidatePath(`/participants/${doc.participantId}`);
    return { ok: true, chunks: chunks.length };
  } catch (err) {
    console.error("ingestDocument failed:", err);
    return { ok: false, error: "Couldn't ingest the document." };
  }
}
