// session.ts — the app's identity seam: the ONE place that answers "who is using
// the app, and what can they do".
//
// Phase E (step 1): this reads the signed-in Supabase Auth user and maps it to a
// Worker row via Worker.supabaseUserId, creating the Worker on first login. Every
// caller (getCurrentUser / getCurrentWorker / getCurrentSector) is unchanged —
// only the internals moved from the dev role-switch cookie to real auth.
//
// Phase E (step 4): when DEV_AUTH=1 (local/sandbox, where Supabase Auth isn't
// reachable) we fall back to the dev role-switch cookie. Never active in
// production — see dev-auth.ts.

import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DEV_AUTH } from "@/lib/dev-auth";
import { isEmailAllowed } from "@/lib/allowlist";
import { Role, SectorMode } from "@/lib/enums";

// The dev role-switch cookie: the worker id to act as (DEV_AUTH only).
export const WORKER_COOKIE = "dsw_worker_id";

// Everyone in the app, for the dev role-switch dropdown (DEV_AUTH only).
export async function listWorkers() {
  return prisma.worker.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

// A friendly display name for a brand-new Worker, derived from the auth user.
function deriveName(user: User): string {
  const metaName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined);
  if (metaName) return metaName;
  if (user.email) return user.email.split("@")[0];
  return "New worker";
}

// The user currently signed in, as a Worker row — or null if not authenticated.
// Looks up the Worker linked to the Supabase auth user, creating it on first
// login. Wrapped in cache() so repeated calls within one render (layout + page
// + getCurrentSector) share a single Supabase/DB round-trip.
export const getCurrentUser = cache(async () => {
  // DEV_AUTH (local/sandbox only): resolve from the role-switch cookie instead of
  // Supabase, falling back to the first worker so the app always has someone in
  // context during development. Never active in production (see dev-auth.ts).
  if (DEV_AUTH) {
    const store = await cookies();
    const id = store.get(WORKER_COOKIE)?.value;
    if (id) {
      const worker = await prisma.worker.findUnique({ where: { id } });
      if (worker) return worker;
    }
    return prisma.worker.findFirst({ orderBy: { createdAt: "asc" } });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Allowlist gate (defence in depth alongside the proxy): a non-approved email gets
  // no Worker row and no data. No-op unless AUTH_ALLOWLIST is set.
  if (!isEmailAllowed(user.email)) return null;

  const existing = await prisma.worker.findUnique({
    where: { supabaseUserId: user.id },
  });
  if (existing) return existing;

  // First login for this auth user → create their Worker. upsert (not create)
  // so two concurrent first requests can't race to a duplicate supabaseUserId.
  return prisma.worker.upsert({
    where: { supabaseUserId: user.id },
    update: {},
    create: {
      supabaseUserId: user.id,
      name: deriveName(user),
      role: Role.WORKER,
    },
  });
});

/** @deprecated use getCurrentUser */
export const getCurrentWorker = getCurrentUser;

// The sector mode for the current user's organisation (default NDIS). Drives the
// sectorConfig label maps so the UI can be re-skinned per sector (Rule 4).
export async function getCurrentSector(): Promise<SectorMode> {
  const user = await getCurrentUser();
  if (!user?.organisationId) return SectorMode.NDIS;
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  });
  return (org?.sectorMode as SectorMode) ?? SectorMode.NDIS;
}
