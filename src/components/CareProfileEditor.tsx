// CareProfileEditor.tsx — edit a participant's care profile: pick condition tags
// (which suggest support-need flags), then fine-tune the flags. Saving switches which
// capture chips that participant's workers see. Coordinator/clinical only (the route
// is capability-gated; the server action re-checks).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONDITIONS,
  SupportNeed,
  NEED_LABELS,
  suggestNeeds,
} from "@/lib/care-needs";
import { saveCareProfile } from "@/lib/care-profile-actions";

const ALL_NEEDS = Object.values(SupportNeed);

export function CareProfileEditor({
  participantId,
  participantName,
  initialConditions,
  initialNeeds,
}: {
  participantId: string;
  participantName: string;
  initialConditions: string[];
  initialNeeds: string[];
}) {
  const router = useRouter();
  const [conditions, setConditions] = useState<string[]>(initialConditions);
  const [needs, setNeeds] = useState<string[]>(initialNeeds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Toggle a condition; when turning one ON, pre-tick its suggested flags (the worker
  // can then untick). Turning a condition off leaves flags alone (they're the truth).
  function toggleCondition(c: string) {
    setConditions((prev) => {
      const on = prev.includes(c);
      const next = on ? prev.filter((x) => x !== c) : [...prev, c];
      if (!on) {
        const suggested = suggestNeeds([c]);
        setNeeds((cur) => [...new Set([...cur, ...suggested])]);
      }
      return next;
    });
  }

  function toggleNeed(n: string) {
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function onSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await saveCareProfile(participantId, conditions, needs);
      if (res.ok) {
        setMessage("Saved.");
        router.refresh();
      } else {
        setMessage(res.error ?? "Couldn't save.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Care profile</h1>
        <p className="mt-1 text-sm text-muted">
          {participantName} — tailor which capture chips workers see, based on support needs.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Conditions</div>
        <p className="text-xs text-muted">Tagging a condition suggests support needs — you can adjust them below.</p>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCondition(c)}
                aria-pressed={on}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "border-brand bg-brand-tint text-brand"
                    : "border-border bg-surface text-muted hover:bg-surface-sunk"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Support needs</div>
        <p className="text-xs text-muted">These switch the participant&rsquo;s capture chips on. This is the source of truth.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_NEEDS.map((n) => {
            const on = needs.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleNeed(n)}
                aria-pressed={on}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-surface text-muted hover:bg-surface-sunk"
                }`}
              >
                {NEED_LABELS[n]}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-12 rounded-2xl bg-brand px-6 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save care profile"}
        </button>
        {message && <span className="text-sm font-medium text-muted">{message}</span>}
      </div>
    </div>
  );
}
