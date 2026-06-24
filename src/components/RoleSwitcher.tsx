// RoleSwitcher.tsx — dev-only control to act as any worker (DEV_AUTH only).
// Picking a name submits the form, which runs the server action and refreshes.

"use client";

import { setCurrentWorker } from "@/lib/session-actions";
import { roleLabel } from "@/lib/enums";

type WorkerLite = { id: string; name: string; role: string };

export function RoleSwitcher({
  workers,
  currentId,
}: {
  workers: WorkerLite[];
  currentId?: string;
}) {
  return (
    <form action={setCurrentWorker} className="flex items-center gap-2">
      <label htmlFor="workerId" className="text-xs font-medium text-zinc-500">
        Viewing as
      </label>
      <select
        id="workerId"
        name="workerId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
      >
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} · {roleLabel(w.role)}
          </option>
        ))}
      </select>
      {/* Fallback for when JavaScript hasn't loaded yet. */}
      <noscript>
        <button type="submit" className="text-sm underline">
          Switch
        </button>
      </noscript>
    </form>
  );
}
