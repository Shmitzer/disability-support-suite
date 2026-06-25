// OrgSettingsForm.tsx — admin control for organisation-wide settings. Currently the
// per-shift auto-suggest cap. Admin only (the route is capability-gated; the action
// re-checks server-side).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAutoSuggestCap, saveCairaEnabled } from "@/lib/org-settings-actions";
import { MAX_AUTO_SUGGEST_CAP } from "@/lib/org-settings-constants";

export function OrgSettingsForm({
  initialCap,
  initialCairaEnabled,
}: {
  initialCap: number;
  initialCairaEnabled: boolean;
}) {
  const router = useRouter();
  const [cap, setCap] = useState(initialCap);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [cairaEnabled, setCairaEnabled] = useState(initialCairaEnabled);
  const [savingCaira, setSavingCaira] = useState(false);
  const [cairaMessage, setCairaMessage] = useState("");

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

  async function onToggleCaira(next: boolean) {
    // Optimistic: flip immediately, revert if the save fails.
    const prev = cairaEnabled;
    setCairaEnabled(next);
    setSavingCaira(true);
    setCairaMessage("");
    try {
      const res = await saveCairaEnabled(next);
      if (res.ok) {
        setCairaMessage("Saved.");
        router.refresh();
      } else {
        setCairaEnabled(prev);
        setCairaMessage(res.error ?? "Couldn't save.");
      }
    } catch {
      setCairaEnabled(prev);
      setCairaMessage("Couldn't save.");
    } finally {
      setSavingCaira(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-base font-bold text-foreground">Caira character</h2>
        <p className="mt-1 text-sm text-muted">
          Show Caira — the animated assistant in the top bar, plus her helper overlays
          and friendly empty/loading states — for everyone in your organisation. Turn
          this off for a plainer, character-free interface.
        </p>
      </div>

      <label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
        <span>Caira enabled for all users</span>
        <button
          type="button"
          role="switch"
          aria-checked={cairaEnabled}
          aria-label="Caira enabled for all users"
          disabled={savingCaira}
          onClick={() => onToggleCaira(!cairaEnabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            cairaEnabled ? "bg-brand" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              cairaEnabled ? "translate-x-[1.375rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      {cairaMessage && <span className="text-sm font-medium text-muted">{cairaMessage}</span>}
    </div>

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
    </div>
  );
}
