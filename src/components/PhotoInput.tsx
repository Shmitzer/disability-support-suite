// PhotoInput.tsx — pick photo(s) for a log entry. Controlled: the parent owns the
// `photos` array (and renders the hidden form field), so the same control can live
// in the capture header (icon-only) AND in the timeline's edit form.
//
// Each picked image is DOWNSCALED on the device (canvas → small JPEG data URL)
// before it's stored, so there's no file-upload / hosting machinery. DEV/DUMMY
// photos only until the Phase-5 privacy gate.

"use client";

import { useState } from "react";

const MAX_PHOTOS = 5;
const MAX_EDGE = 512; // longest side, px — keeps the stored image small

export function PhotoInput({
  photos,
  onChange,
  iconOnly = false,
  mode = "all",
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  iconOnly?: boolean;
  // Which parts to render: both (default), just the 📷 add button, or just the
  // thumbnails. Lets the add button and the photos live in different spots while
  // sharing one photo array.
  mode?: "all" | "add" | "thumbs";
}) {
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // let the same file be re-picked later
    if (!files.length) return;
    setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const thumbs: string[] = [];
    for (const f of files.slice(0, room)) {
      try {
        thumbs.push(await downscale(f));
      } catch {
        // Skip anything that isn't a readable image.
      }
    }
    onChange([...photos, ...thumbs]);
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {mode !== "add" &&
        photos.map((src, i) => (
          <span key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-8 w-8 rounded-md border border-zinc-200 object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-white"
            >
              ×
            </button>
          </span>
        ))}

      {mode !== "thumbs" && photos.length < MAX_PHOTOS && (
        <label
          aria-label="Add photo"
          className={
            iconOnly
              ? // A borderless, enlarged square so the 📷 reads as a clear tap target.
                // The glyph sits optically low, so nudge it up a touch to line up
                // with the heading.
                "flex h-10 w-10 -translate-y-0.5 cursor-pointer items-center justify-center rounded-md text-2xl leading-none transition-opacity hover:opacity-70"
              : "flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          }
        >
          <span aria-hidden>📷</span>
          {!iconOnly && (busy ? "Adding…" : photos.length ? "Add another photo" : "Add photo")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={onPick}
            className="sr-only"
          />
        </label>
      )}
    </span>
  );
}

// Read a File, draw it onto a canvas no larger than MAX_EDGE on its longest side,
// and return a compact JPEG data URL.
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width >= height && width > MAX_EDGE) {
        height = Math.round((height * MAX_EDGE) / width);
        width = MAX_EDGE;
      } else if (height > MAX_EDGE) {
        width = Math.round((width * MAX_EDGE) / height);
        height = MAX_EDGE;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
