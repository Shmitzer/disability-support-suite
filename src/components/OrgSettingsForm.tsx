// OrgSettingsForm.tsx — admin control for organisation-wide settings. Currently the
// per-shift auto-suggest cap. Admin only (the route is capability-gated; the action
// re-checks server-side).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAutoSuggestCap } from "@/lib/org-settings-actions";
import { MAX_AUTO_SUGGEST_CAP } from "@/lib/org-settings-constants";

export function OrgSettingsForm({ initialCap }: { initialCap: number }) {
  const router = useRouter();
  const [cap, setCap] = useState(initialCap);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function onSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await saveAutoSuggestCap(cap);
      setMessage(res.ok ? "Saved." : (res.error ?? "Couldn't save."));
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-base font-bold text-foreground">AI suggestions</h2>
        <p className="mt-1 text-sm text-muted">
          How many <strong>automatic</strong> AI prompts (e.g. &ldquo;Did Sam buy anything?&rdquo;)
          can appear per shift. Workers can always tap &ldquo;Suggest what to add&rdquo; for
          more — this only limits the ones that appear unprompted. Set to 0 to turn auto
          suggestions off.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        Automatic suggestions per shift
        <input
          type="number"
          min={0}
          max={MAX_AUTO_SUGGEST_CAP}
          value={cap}
          onChange={(e) => setCap(Math.max(0, Math.min(MAX_AUTO_SUGGEST_CAP, Number(e.target.value))))}
          className="h-11 w-24 rounded-xl border border-border bg-surface px-3 text-base text-foreground focus:border-brand focus:outline-none"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-11 rounded-2xl bg-brand px-6 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <span className="text-sm font-medium text-muted">{message}</span>}
      </div>
    </div>
  );
}
