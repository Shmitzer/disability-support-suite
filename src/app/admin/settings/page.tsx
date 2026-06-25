// /admin/settings — organisation settings (real, live). Admin only
// (Capability.OrgSettingsManage). Unlike /admin (a mock dashboard), this reads/writes
// the live Organisation. Auth-gated by middleware; capability re-checked here.

import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import { getCurrentUser } from "@/lib/session";
import { can, Capability } from "@/lib/rbac";
import { getOrgAutoSuggestCap } from "@/lib/org-settings";
import { OrgSettingsForm } from "@/components/OrgSettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `${APP_NAME} — Settings` };

export default async function AdminSettingsPage() {
  const worker = await getCurrentUser();
  if (!worker) notFound();
  if (!can(worker.role, Capability.OrgSettingsManage)) notFound();

  const autoSuggestCap = await getOrgAutoSuggestCap(worker.organisationId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Settings</h1>
        <Link href="/admin" className="text-sm font-medium text-brand">
          ← Dashboard
        </Link>
      </div>
      <OrgSettingsForm initialCap={autoSuggestCap} />
    </main>
  );
}
