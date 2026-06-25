"use client";

import { useState } from "react";

type ToggleRole = "worker" | "supervisor" | "participant";

/**
 * CairaAccessToggle — admin/supervisor control to grant or revoke Caira web search
 * for one user. Participants are locked off (no toggle). Only render this for
 * admin/supervisor viewers — workers never see it (enforced by the parent screen).
 */
export default function CairaAccessToggle({
  userId,
  userRole,
  currentAccess,
  grantedAt,
  onUpdate,
}: {
  userId: string;
  userRole: ToggleRole;
  currentAccess: boolean;
  grantedAt?: Date | string | null;
  onUpdate?: () => void;
}) {
  const [access, setAccess] = useState(currentAccess);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Participants can never be granted web access (one of three guardrails).
  if (userRole === "participant") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        🔒 Not available for participants
      </span>
    );
  }

  async function onToggle() {
    const next = !access;
    setAccess(next); // optimistic
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/caira-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, webAccess: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't update access.");
      }
      onUpdate?.();
    } catch (err) {
      setAccess(!next); // revert
      setError(err instanceof Error ? err.message : "Couldn't update access.");
    } finally {
      setSaving(false);
    }
  }

  const when =
    grantedAt && access
      ? new Date(grantedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Caira web search</span>
        <button
          type="button"
          role="switch"
          aria-checked={access}
          aria-label="Caira web search"
          disabled={saving}
          onClick={onToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            access ? "bg-brand" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              access ? "translate-x-[1.375rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <span className="text-xs text-muted">
        {access ? `Enabled${when ? ` ${when}` : ""}` : "Off — local context only"}
      </span>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
