// TimelineEntry.tsx — one logged entry on the shift timeline.
//
// Two states:
//   • Collapsed (default): a glanceable row — coloured dot, heading + structured
//     detail, the time, a photo thumbnail, and (while the shift runs) a bin. The
//     free-text NOTE is deliberately NOT shown here, so the timeline stays skimmable.
//   • Expanded (tap the card): the entry in full, including the note. Each aspect
//     — detail, note, time — is tap-to-edit in place; photos use the same icon-only
//     control as the capture form. A "Save changes" appears only once something
//     actually changes.
//
// Client component (it holds the expand/edit state).

"use client";

import { useState } from "react";
import { deleteLogEntry, updateLogEntry } from "@/lib/log-actions";
import { findCategory } from "@/lib/log-categories";
import { catColor } from "@/lib/category-colors";
import { DetailFields } from "@/components/DetailFields";
import { PhotoInput } from "@/components/PhotoInput";

type Entry = {
  id: string;
  category: string;
  detail: string | null;
  notes: string;
  photos: string | null; // JSON array of small image data URLs
  timestamp: Date;
};

export function TimelineEntry({
  entry,
  editable,
  learnedOptions,
}: {
  entry: Entry;
  editable: boolean;
  learnedOptions: Record<string, string[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState<"note" | "time" | null>(null);
  const [changing, setChanging] = useState(false); // re-pick the structured detail
  const [groupValues, setGroupValues] = useState<Record<string, string[]>>({});
  const [confirming, setConfirming] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null); // enlarged photo

  // Editable copies of the fields, so an expanded card can edit them and a
  // close/cancel reverts to what's saved.
  const [notes, setNotes] = useState(entry.notes);
  const [time, setTime] = useState(hhmm(entry.timestamp));
  const [photos, setPhotos] = useState<string[]>(() => parsePhotos(entry.photos));

  const cat = findCategory(entry.category);
  const colors = catColor(entry.category);
  const heading = cat?.label ?? entry.category;
  const thumbs = parsePhotos(entry.photos);

  // Has anything actually been edited? Only then do we offer "Save changes".
  const dirty =
    changing ||
    notes !== entry.notes ||
    time !== hhmm(entry.timestamp) ||
    JSON.stringify(photos) !== JSON.stringify(thumbs);

  function collapse() {
    setExpanded(false);
    setEditingField(null);
    setChanging(false);
    setGroupValues({});
    setConfirming(false);
    setViewing(null);
    // Discard any unsaved edits.
    setNotes(entry.notes);
    setTime(hhmm(entry.timestamp));
    setPhotos(parsePhotos(entry.photos));
  }

  async function handleSave(formData: FormData) {
    await updateLogEntry(formData);
    collapse();
  }

  return (
    <li className="relative flex items-start gap-3">
      {/* The dot on the rail, coloured by category, with its emoji. */}
      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base ${colors.dot}`}
      >
        <span aria-hidden>{cat?.emoji ?? "•"}</span>
      </span>

      <div className={`flex-1 rounded-xl border px-4 py-3 shadow-sm ${colors.card}`}>
        {expanded ? (
          <div className="flex flex-col gap-3">
            {editable ? (
              <>
                <form action={handleSave} className="flex flex-col gap-3">
                  <input type="hidden" name="entryId" value={entry.id} />
                  {/* Photos ride along here; the control itself sits in the right
                      column below, where the thumbnail already was. */}
                  <input type="hidden" name="photos" value={JSON.stringify(photos)} />

                  {/* Heading + the 📷 add button, enlarged and centred between the
                      heading and the card edge. */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-zinc-900">{heading}</span>
                    <div className="flex flex-1 justify-center">
                      <PhotoInput iconOnly mode="add" photos={photos} onChange={setPhotos} />
                    </div>
                  </div>

                  {/* DETAIL on the left; the photo thumbnail sits on the right of this
                      row (the 📷 to add one lives up beside the heading). */}
                  <Aspect label="Detail">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {changing ? (
                          <DetailFields
                            category={entry.category}
                            learnedOptions={learnedOptions}
                            values={groupValues}
                            onGroupChange={(k, v) => setGroupValues((s) => ({ ...s, [k]: v }))}
                          />
                        ) : (
                          <EditField onClick={() => setChanging(true)}>
                            {entry.detail || <span className="text-zinc-400">No detail — add</span>}
                          </EditField>
                        )}
                      </div>
                      {photos.length > 0 && (
                        <div className="shrink-0">
                          <PhotoInput mode="thumbs" photos={photos} onChange={setPhotos} />
                        </div>
                      )}
                    </div>
                  </Aspect>

                  {/* NOTE — tap the text (full width) to edit it. */}
                  <Aspect label="Note">
                    {editingField === "note" ? (
                      <textarea
                        name="notes"
                        rows={3}
                        autoFocus
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note"
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
                      />
                    ) : (
                      <>
                        <input type="hidden" name="notes" value={notes} />
                        <EditField onClick={() => setEditingField("note")}>
                          {notes || <span className="text-zinc-400">Add a note</span>}
                        </EditField>
                      </>
                    )}
                  </Aspect>

                  {/* TIME — tap to adjust. */}
                  <Aspect label="Time">
                    {editingField === "time" ? (
                      <input
                        type="time"
                        name="loggedTime"
                        autoFocus
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="self-start rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-base text-zinc-900 focus:border-blue-400 focus:outline-none"
                      />
                    ) : (
                      <>
                        <input type="hidden" name="loggedTime" value={time} />
                        <EditField onClick={() => setEditingField("time")}>
                          {displayHHMM(time)}
                        </EditField>
                      </>
                    )}
                  </Aspect>

                  {/* Save only appears once something has actually changed. */}
                  {dirty && (
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Save changes
                    </button>
                  )}
                </form>

                {/* Footer — OUTSIDE the edit form (HTML forms can't nest the delete
                    form). Discard/close on the left, the bin on the right. */}
                <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                  <button
                    type="button"
                    onClick={collapse}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                  >
                    {dirty ? "Discard changes" : "Close"}
                  </button>
                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Delete this entry?</span>
                      <form action={deleteLogEntry}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                          Yes
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label="Remove entry"
                      onClick={() => setConfirming(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-700 transition-colors hover:bg-red-200"
                    >
                      {binSvg}
                    </button>
                  )}
                </div>
              </>
            ) : (
              // Read-only expanded (a completed shift): full detail, no editing.
              <>
                <span className="text-lg font-semibold text-zinc-900">{heading}</span>
                <Aspect label="Detail">
                  <span className="text-base text-zinc-700">{entry.detail || "—"}</span>
                </Aspect>
                <Aspect label="Note">
                  <span className="text-base text-zinc-700">{entry.notes || "—"}</span>
                </Aspect>
                <Aspect label="Time">
                  <span className="text-base text-zinc-700">{formatTime(entry.timestamp)}</span>
                </Aspect>
                {thumbs.length > 0 && (
                  <Aspect label="Photos">
                    <div className="flex flex-wrap gap-1.5">
                      {thumbs.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt="Attached photo"
                          onClick={() => setViewing((v) => (v === src ? null : src))}
                          className="h-12 w-12 cursor-pointer rounded-md border border-zinc-200 object-cover"
                        />
                      ))}
                    </div>
                  </Aspect>
                )}
                {viewing && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewing}
                    alt="Attached photo"
                    onClick={() => setViewing(null)}
                    className="max-h-72 w-full cursor-zoom-out rounded-lg border border-zinc-200 object-contain"
                  />
                )}
                <div className="flex justify-end border-t border-zinc-200 pt-2">
                  <button
                    type="button"
                    onClick={collapse}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          // COLLAPSED — glanceable. No note text. Tap the card to expand.
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded(true);
              }
            }}
            className="flex cursor-pointer flex-col gap-1"
          >
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-lg font-semibold text-zinc-900">{heading}</span>
                {entry.detail && <span className="text-base text-zinc-500">{entry.detail}</span>}
              </div>

              {/* Right column: time on top, the photo thumbnail beneath it. */}
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-base tabular-nums text-zinc-500">
                  {formatTime(entry.timestamp)}
                </span>
                {thumbs.length > 0 && (
                  // Tiny thumbnails; tapping one enlarges it (and doesn't open the card).
                  <div
                    className="flex flex-wrap justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {thumbs.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt="Attached photo"
                        onClick={() => setViewing((v) => (v === src ? null : src))}
                        className="h-10 w-10 cursor-pointer rounded-md border border-zinc-200 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Enlarged photo (when a thumbnail is tapped), full-width. */}
            {viewing && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewing}
                alt="Attached photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing(null);
                }}
                className="mt-1 max-h-72 w-full cursor-zoom-out rounded-lg border border-zinc-200 object-contain"
              />
            )}

            {/* Bin — anchored to the card's bottom-right; doesn't open the card. */}
            {editable && (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                {confirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Delete?</span>
                    <form action={deleteLogEntry}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                        Yes
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Remove entry"
                    onClick={() => setConfirming(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-700 transition-colors hover:bg-red-200"
                  >
                    {binSvg}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// A labelled aspect in the expanded view: a small-caps label above its content.
function Aspect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

// Shared style for an editable field's text — blue + underline-on-hover so it
// reads as "tap me to edit", not plain text.
// Small pencil (inline SVG — the app has no icon library).
const pencilSvg = (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

// An editable value row: dark text with a small grey pencil hint, so it reads as
// tappable without the loud link blue. The pencil flows inline right after the
// text so it sits at the END of the text. We glue it to the last word (a
// `whitespace-nowrap` span) so that when the text wraps, the pencil travels with
// the last word instead of dropping onto a line of its own. `w-full` keeps the
// whole row a tap target.
function EditField({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const pencil = (
    <span className="ml-1.5 inline-block align-middle text-zinc-400">{pencilSvg}</span>
  );

  let content: React.ReactNode;
  if (typeof children === "string") {
    const i = children.trimEnd().lastIndexOf(" ");
    const head = i === -1 ? "" : children.slice(0, i + 1);
    const tail = i === -1 ? children : children.slice(i + 1);
    content = (
      <>
        {head}
        <span style={{ whiteSpace: "nowrap" }}>
          {tail}
          {pencil}
        </span>
      </>
    );
  } else {
    // A placeholder (a <span>) — keep it and the pencil together as one unit.
    content = (
      <span style={{ whiteSpace: "nowrap" }}>
        {children}
        {pencil}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer text-left text-base text-zinc-800 transition-colors hover:text-zinc-900"
    >
      {content}
    </button>
  );
}

// Outline bin (inline SVG — the app has no icon library).
const binSvg = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
    <path d="M9 7V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
  </svg>
);

// Parse the stored JSON array of photo data URLs (empty list if absent/bad).
function parsePhotos(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Turn an "HH:MM" (24h) value into a friendly "9:48 am" for the read display.
function displayHHMM(v: string): string {
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
