// QuickShiftStarter.tsx — the "Start a quick shift" card on the worker home.
//
// Lets a worker begin logging immediately without a rostered shift: pick a
// sample participant from the dropdown, OR type any name to try, then Start.
// It posts to the startQuickShift server action, which creates the shift and
// sends you straight to its tracker (/shift/[id]).
//
// Server component: it's a plain <form> wired to a server action, so it works
// with no client-side JavaScript (same pattern as the roster forms).

import { startQuickShift } from "@/lib/quick-shift-actions";

type Participant = { id: string; name: string };

export function QuickShiftStarter({ participants }: { participants: Participant[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm ring-1 ring-inset ring-blue-100">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold text-zinc-900">Start a quick shift</h2>
        <p className="text-sm text-zinc-600">Begin logging straight away — no roster needed.</p>
      </div>

      <form action={startQuickShift} className="flex flex-col gap-3">
        {participants.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Pick someone</span>
            <select
              name="participantId"
              defaultValue={participants[0]?.id}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">…or type a name to try</span>
          <input
            type="text"
            name="participantName"
            placeholder="e.g. Test Participant"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-zinc-400">
            If you type a name, it’s used instead of the pick above. Use a fake name — sample data only.
          </span>
        </label>

        <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700">
          Start quick shift →
        </button>
      </form>
    </section>
  );
}
