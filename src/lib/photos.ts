// photos.ts — pure, dependency-free logic for the shift-photo round-trip, split out
// so it can be unit-tested without a database, a Storage bucket, or the network.
//
// The flow: the edit form submits an array of strings — each is either a NEWLY added
// image (a data: URL) or an EXISTING stored photo being kept (a signed display URL).
// planPhotoUpdate() decides, per item, what to persist; the server action (log-actions)
// executes the plan (doing the actual uploads). Storage stores RELATIVE paths (Rule 3);
// without Storage configured we fall back to small inline data URLs (dev/sandbox).

export type PhotoAction =
  | { kind: "upload"; dataUrl: string } // new image, Storage on → upload, store path
  | { kind: "inline"; dataUrl: string } // new image, Storage off → keep inline
  | { kind: "keep"; path: string }; // existing stored photo being kept

export const MAX_PHOTOS = 5;
const INLINE_MAX_CHARS = 2_000_000; // ~2 MB inline data-URL guard (no-Storage path)
const UPLOAD_MAX_CHARS = 8_000_000; // ~6 MB image guard before upload

// Recover the stored relative path from one of our signed display URLs. The path
// sits after the bucket segment of `/storage/v1/object/sign/<bucket>/<path>?token`.
// Bucket-agnostic (drops the first segment), so it needs no env. Returns null for
// anything that isn't such a URL — e.g. a legacy inline data URL.
export function extractStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/sign/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  let rest = url.slice(i + marker.length);
  const q = rest.indexOf("?");
  if (q !== -1) rest = rest.slice(0, q);
  const slash = rest.indexOf("/"); // separates <bucket> from <path>
  if (slash === -1) return null;
  return decodeURIComponent(rest.slice(slash + 1));
}

// Decide what to persist for each submitted photo. Never trusts the browser:
//   • a data: image → upload (Storage on) or keep inline (off), within size caps;
//   • anything else → an existing photo, KEPT only if its path is in `keepable`
//     (so a tampered form can't attach an arbitrary object from another shift).
// Order and the 5-photo cap are preserved.
export function planPhotoUpdate(
  items: unknown,
  opts: { keepable: readonly string[]; storageEnabled: boolean },
): PhotoAction[] {
  if (!Array.isArray(items)) return [];
  const keepable = new Set(opts.keepable);
  const plan: PhotoAction[] = [];

  for (const item of items) {
    if (plan.length >= MAX_PHOTOS) break;
    if (typeof item !== "string") continue;

    if (item.startsWith("data:image/")) {
      if (opts.storageEnabled) {
        if (item.length <= UPLOAD_MAX_CHARS) plan.push({ kind: "upload", dataUrl: item });
      } else if (item.length < INLINE_MAX_CHARS) {
        plan.push({ kind: "inline", dataUrl: item });
      }
      continue;
    }

    const path = extractStoragePath(item) ?? item;
    if (keepable.has(path)) plan.push({ kind: "keep", path });
  }

  return plan;
}
