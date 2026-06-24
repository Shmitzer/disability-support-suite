// storage.ts — server-side Supabase Storage for shift-log photos (Phase F, Rule 3:
// store RELATIVE paths, never absolute URLs). Uses the service-role key so uploads
// bypass Storage RLS; this module must only ever be imported on the server.
//
// Env-gated: storageConfigured() is false until NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY are set, so nothing changes in dev/sandbox.
//
// SCOPE: this is the storage primitive. Cutting the photo flow over to it is a
// follow-up that needs a real (PRIVATE) bucket to verify, because the timeline's
// edit form round-trips photo identifiers: stored values must move from inline
// data URLs to { path } so an edit re-submits the path (kept) vs a new data URL
// (uploaded), and the shift page must resolve paths → signed URLs for display via
// signPhotoUrls(). Doing that swap without a bucket to test risks dropping
// participant photos, so it's intentionally left for the credentialed environment.

import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "shift-photos";

export function storageConfigured(): boolean {
  return Boolean(url && serviceKey);
}

let client: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase Storage not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  client ??= createClient(url, serviceKey, { auth: { persistSession: false } });
  return client;
}

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

// Upload a base64 image data URL to the private photos bucket. Returns the stored
// RELATIVE path (e.g. "<shiftId>/<uuid>.jpg") — never an absolute URL (Rule 3).
export async function uploadDataUrl(dataUrl: string, prefix: string): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) throw new Error("not a base64 image data URL");
  const [, mime, b64] = match;
  const ext = (mime.split("/")[1] ?? "bin").replace("jpeg", "jpg");
  const bytes = Buffer.from(b64, "base64");

  const path = `${prefix}/${randomUUID()}.${ext}`;
  const { error } = await getServiceClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return path;
}

// Turn stored relative paths into short-lived signed URLs for display. Legacy
// inline data URLs (pre-migration rows) are passed through unchanged, so the
// render path stays safe during and after the cutover.
export async function signPhotoUrls(paths: string[], expiresIn = 3600): Promise<string[]> {
  if (!paths.length || !storageConfigured()) return paths;
  const svc = getServiceClient();
  const out: string[] = [];
  for (const p of paths) {
    if (p.startsWith("data:")) {
      out.push(p); // legacy inline image — nothing to sign
      continue;
    }
    const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(p, expiresIn);
    out.push(error || !data ? p : data.signedUrl);
  }
  return out;
}

// Resolve a stored LogEntry.photos JSON (relative paths and/or legacy data URLs)
// into a JSON array of display URLs (signed for paths, data URLs passed through).
// Shape-preserving: null in → null out; malformed in → returned unchanged.
export async function signStoredPhotos(json: string | null): Promise<string | null> {
  if (!json) return null;
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch {
    return json;
  }
  if (!Array.isArray(arr)) return json;
  const paths = arr.filter((x): x is string => typeof x === "string");
  return JSON.stringify(await signPhotoUrls(paths));
}
