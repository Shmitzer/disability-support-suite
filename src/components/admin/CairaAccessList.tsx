// CairaAccessList — admin section listing org staff with a Caira web-access toggle.
// Server component: fetches the caller's org staff and renders the (client) toggle per
// row. Participants are shown locked off. Reachable only from /admin/settings, which
// is gated to OrgSettingsManage (admins) — workers never see this.

import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/tenant";
import { Role } from "@/lib/enums";
import type { TenantActor } from "@/lib/tenant";
import CairaAccessToggle from "@/components/admin/CairaAccessToggle";

type ToggleRole = "worker" | "supervisor" | "participant";

function toggleRole(role: string): ToggleRole {
  if (role === Role.PARTICIPANT) return "participant";
  if (role === Role.SUPERVISOR || role === Role.ADMIN || role === Role.SUPERADMIN) return "supervisor";
  return "worker";
}

export default async function CairaAccessList({ viewer }: { viewer: TenantActor }) {
  let staff: Array<{
    id: string;
    name: string;
    role: string;
    cairaWebAccess?: boolean;
    cairaWebAccessGrantedAt?: Date | null;
  }> = [];

  try {
    staff = await prisma.worker.findMany({
      where: { ...tenantScope(viewer) },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        cairaWebAccess: true,
        cairaWebAccessGrantedAt: true,
      },
    });
  } catch {
    // cairaWebAccess columns not applied yet — render nothing rather than erroring.
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-base font-bold text-foreground">Caira web access</h2>
        <p className="mt-1 text-sm text-muted">
          By default Caira has no internet access. Turn on web search for individual
          workers or supervisors who need to look things up (e.g. NDIS guidelines). You
          decide who gets it — there is no system filter on what they can search, so
          grant it deliberately. Participants can never be given web access.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{s.name}</span>
              <span className="rounded bg-surface-sunk px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {s.role}
              </span>
            </div>
            <div className="sm:w-56">
              <CairaAccessToggle
                userId={s.id}
                userRole={toggleRole(s.role)}
                currentAccess={Boolean(s.cairaWebAccess)}
                grantedAt={s.cairaWebAccessGrantedAt ?? null}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
