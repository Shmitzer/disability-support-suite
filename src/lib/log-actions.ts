// log-actions.ts — the shift tracker's two server actions: add a log entry, and
// remove one you tapped by mistake.
//
// These power task 1f: during a shift, a worker taps a chip (Meal, Fluids, …),
// optionally types a note, and it lands on the live timeline.
//
// Same house rules as the other *-actions files:
//   • "use server" — these run on the server, never in the browser.
//   • Each action re-checks who's calling and whether they're allowed to do this
//     (a form on the page is never trusted on its own).
//   • A worker only logs against their OWN shift, and only while it's running.

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorker } from "@/lib/session";
import { tenantOwner } from "@/lib/tenant";
import {
  isLogCategory,
  categoryRequiresNote,
  findCategory,
  validDetailsFor,
} from "@/lib/log-categories";
import { getApprovedOptions, recordCustomOption } from "@/lib/learned-options";
import { storageConfigured, uploadDataUrl, extractStoragePath } from "@/lib/storage";
import { revalidatePath } from "next/cache";

// Add one entry to a shift's log. Allowed only on the caller's own shift while
// it's IN_PROGRESS (you log while you're there, not before or after).
export async function addLogEntry(formData: FormData) {
  const worker = await getCurrentWorker();
  const shiftId = String(formData.get("shiftId") ?? "");
  const category = String(formData.get("category") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!worker || !shiftId) return;

  // Only categories we actually offer (guards against a tampered form).
  if (!isLogCategory(category)) return;

  // Some categories (e.g. a free-text "Note") are meaningless without text.
  if (categoryRequiresNote(category) && !notes) return;

  // Conditional note requirement (e.g. medication PRN/Refused needs a reason).
  const rnw = findCategory(category)?.requireNoteWhen;
  if (rnw && !notes) {
    const picked = formData.getAll(rnw.group).map((v) => String(v));
    if (picked.some((v) => rnw.in.includes(v))) return;
  }

  // Structured detail: the picked options + amount + free-text fields, rebuilt on
  // the server (never trust the browser's text). Self-learning groups spell-match
  // and learn typed "Other" values.
  const detail = await buildDetail(category, formData);

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  // Must be this worker's own shift, and currently being worked.
  if (!shift || shift.allocatedToId !== worker.id || shift.status !== "IN_PROGRESS") return;

  // Idempotency (Rule 12): a client-generated key dedupes double-taps / retries
  // on a flaky mobile connection so the same entry can't be logged twice.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "") || null;
  if (idempotencyKey) {
    const existing = await prisma.logEntry.findUnique({ where: { idempotencyKey } });
    if (existing) {
      revalidatePath(`/shift/${shiftId}`);
      return; // already logged — do not create a duplicate
    }
  }

  // Upload any newly-attached photos to Storage (or keep inline if not configured),
  // keyed under this shift. New entry → nothing to "keep", only fresh images.
  const photos = await processPhotos(formData.get("photos"), { prefix: shiftId });

  try {
    await prisma.logEntry.create({
      data: {
        shiftId,
        category,
        detail: detail || null, // null, not "", when nothing structured was picked
        photos,
        notes,
        // `timestamp` = when it happened. Default is the server's "now"; if the
        // worker adjusted the time we use that (today's date + their HH:MM).
        timestamp: entryTimestamp(formData.get("loggedTime")),
        idempotencyKey,
        ...tenantOwner(worker),
      },
    });
  } catch (err) {
    // A concurrent identical submit won the unique race — treat as already done.
    if (!isUniqueViolation(err)) throw err;
  }

  revalidatePath(`/shift/${shiftId}`);
}

// Prisma raises error code P2002 when a @unique constraint (here idempotencyKey)
// is violated — i.e. a duplicate we can safely ignore.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002"
  );
}

// Validate + persist the submitted photos. We never trust the browser. Each item is
// either a freshly-added image (a data: URL) or an existing stored photo being kept
// (a signed display URL → its path). With Supabase Storage configured, new images
// are uploaded and we store RELATIVE paths (Rule 3); without it we fall back to
// storing the small inline data URLs (dev/sandbox). Caps the count at 5. Returns a
// JSON string to store, or null.
async function processPhotos(
  raw: FormDataEntryValue | null,
  opts: { prefix: string; keepPaths?: string[] },
): Promise<string | null> {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  let arr: unknown;
  try {
    arr = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;

  // Paths the caller already has on this entry — the only ones we'll "keep" (so a
  // tampered form can't attach an arbitrary object from another shift).
  const keepable = new Set(opts.keepPaths ?? []);
  const out: string[] = [];
  for (const item of arr) {
    if (out.length >= 5) break;
    if (typeof item !== "string") continue;

    if (item.startsWith("data:image/")) {
      // A newly added image (also how a legacy inline photo round-trips — kept on
      // edit it re-uploads, migrating it to Storage).
      if (storageConfigured()) {
        if (item.length > 8_000_000) continue; // pre-upload guard (~6 MB image)
        try {
          out.push(await uploadDataUrl(item, opts.prefix));
        } catch (err) {
          console.error("photo upload failed, skipping:", err);
        }
      } else if (item.length < 2_000_000) {
        out.push(item); // no Storage configured: keep inline (legacy), ~2 MB cap
      }
      continue;
    }

    // Not a data URL → an existing stored photo being kept. Map the signed display
    // URL back to its path and accept it only if it's already on this entry.
    const path = extractStoragePath(item) ?? item;
    if (keepable.has(path)) out.push(path);
  }
  return out.length ? JSON.stringify(out) : null;
}

// The stored photo identifiers currently on an entry (its kept-set on edit).
function storedPhotoPaths(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Decide an entry's timestamp. With no override we use `base` (the server's "now"
// when adding; the entry's existing time when editing). A valid "HH:MM" override
// sets that time on `base`'s DATE — so editing the time keeps the original day. We
// re-validate the format here rather than trusting the browser's value.
function entryTimestamp(raw: FormDataEntryValue | null, base: Date = new Date()): Date {
  const value = String(raw ?? "").trim();
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      const t = new Date(base);
      t.setHours(h, m, 0, 0);
      return t;
    }
  }
  return base;
}

// Build the entry's structured `detail` string from the submitted form. Returns
// "" when there's nothing structured to record. Revamped categories use `groups`:
//   • a self-learning group (`learn`) — a typed "Other" is spell-matched + counted
//     (recordCustomOption); otherwise the pick is validated against the approved list.
//   • a fixed group — picks validated against its options; a free-text "Other" (if
//     allowed, e.g. duration "45 min") is taken as typed.
// Categories not yet revamped fall back to the flat `details` list.
async function buildDetail(category: string, formData: FormData): Promise<string> {
  const cat = findCategory(category);
  const parts: string[] = [];

  if (cat?.groups) {
    // Track each group's chosen values so a `showWhen` group is only honoured when
    // its trigger group qualifies (config lists the trigger before the dependent).
    const chosen: Record<string, string[]> = {};
    for (const g of cat.groups) {
      if (g.showWhen) {
        const dep = chosen[g.showWhen.group] ?? [];
        if (!dep.some((v) => g.showWhen!.in.includes(v))) continue;
      }

      const custom = g.allowOther ? String(formData.get(`${g.key}__other`) ?? "").trim() : "";
      let vals: string[];
      if (g.learn) {
        // Self-learning list (kind = the group key).
        if (custom) {
          const name = await recordCustomOption(g.key, custom);
          vals = name ? [name] : [];
        } else {
          const approved = await getApprovedOptions(g.key);
          vals = formData.getAll(g.key).map((v) => String(v)).filter((v) => approved.includes(v));
        }
      } else {
        vals = formData.getAll(g.key).map((v) => String(v)).filter((v) => g.options.includes(v));
        // A free-text "Other" on a non-learning group (e.g. an exact duration).
        if (custom) vals.push(custom.replace(/\s+/g, " "));
      }

      if (g.mode === "single") vals = vals.slice(0, 1);
      chosen[g.key] = vals;
      parts.push(...vals);
    }
  } else {
    parts.push(...validDetailsFor(category, formData.getAll("details").map((d) => String(d))));
  }

  // Optional amount (e.g. fluids in mL) — for any category that defines one.
  const rawAmount = formData.get("amount");
  const amount = rawAmount != null && String(rawAmount).trim() !== "" ? Number(rawAmount) : null;
  if (cat?.amount && typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    parts.push(`${amount} ${cat.amount.unit}`);
  }

  // Free-text fields (e.g. a medication dose), appended as typed.
  for (const tf of cat?.textFields ?? []) {
    const value = String(formData.get(tf.key) ?? "").trim().replace(/\s+/g, " ");
    if (value) parts.push(value);
  }

  return parts.join(" · ");
}

// Remove a log entry the worker added by mistake. Still only their own shift,
// still only while it's IN_PROGRESS — once the shift is done the log is locked.
export async function deleteLogEntry(formData: FormData) {
  const worker = await getCurrentWorker();
  const entryId = String(formData.get("entryId") ?? "");
  if (!worker || !entryId) return;

  // Load the entry together with its shift so we can check ownership.
  const entry = await prisma.logEntry.findUnique({
    where: { id: entryId },
    include: { shift: true },
  });
  if (!entry) return;
  if (entry.shift.allocatedToId !== worker.id || entry.shift.status !== "IN_PROGRESS") return;

  await prisma.logEntry.delete({ where: { id: entryId } });

  revalidatePath(`/shift/${entry.shiftId}`);
}

// Edit an existing entry's note and time (the structured detail is set at capture;
// to change that, remove and re-add). Same guard as delete: your own running shift.
export async function updateLogEntry(formData: FormData) {
  const worker = await getCurrentWorker();
  const entryId = String(formData.get("entryId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!worker || !entryId) return;

  const entry = await prisma.logEntry.findUnique({
    where: { id: entryId },
    include: { shift: true },
  });
  if (!entry) return;
  if (entry.shift.allocatedToId !== worker.id || entry.shift.status !== "IN_PROGRESS") return;

  // A note that was required at capture (e.g. the free-text "Note") stays required.
  if (categoryRequiresNote(entry.category) && !notes) return;

  // If the worker re-picked the detail ("Change"), rebuild it; otherwise keep the
  // existing detail (editing just the note/time must not wipe it).
  const rebuilt = await buildDetail(entry.category, formData);
  const detail = rebuilt !== "" ? rebuilt : entry.detail;

  // The edit form submits the full photo set: existing photos (kept) + any new ones.
  // Only paths already on this entry may be kept; new images are uploaded.
  const photos = await processPhotos(formData.get("photos"), {
    prefix: entry.shiftId,
    keepPaths: storedPhotoPaths(entry.photos),
  });

  await prisma.logEntry.update({
    where: { id: entryId },
    // Keep the entry's original date; the override only changes the time-of-day.
    data: {
      detail,
      notes,
      photos,
      timestamp: entryTimestamp(formData.get("loggedTime"), entry.timestamp),
    },
  });

  revalidatePath(`/shift/${entry.shiftId}`);
}
