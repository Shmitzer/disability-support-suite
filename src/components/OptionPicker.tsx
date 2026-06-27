// OptionPicker.tsx — the generalised version of the drink picker, reused by every
// revamped category. Two faces, one value (the pattern we keep using):
//   • Web  → chips (single- or multi-select).
//   • Phone → a tappable bar that opens the shared slide-up sheet.
//
// Single-select: tapping a sheet row picks it and closes. Multi-select: rows
// toggle, and a "Done" button closes. An optional "Other…" lets the worker type a
// value not in the list (used where the category should learn new entries).
//
// Whatever's chosen is written to hidden <input> fields named `fieldName`, plus a
// `otherFieldName` text input when "Other" is used — the exact fields the server
// reads. So the rest of the app never needs to know which face was used.

"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";

export function OptionPicker({
  options,
  noun,
  mode,
  fieldName,
  allowOther = false,
  otherFieldName,
  onChange,
}: {
  options: string[];
  noun: string; // shown as "Select {noun}", the sheet title, and "Other {noun}"
  mode: "single" | "multi";
  fieldName: string; // form field the picked value(s) submit under
  allowOther?: boolean;
  otherFieldName?: string; // form field the typed "Other" value submits under
  onChange?: (values: string[]) => void; // notifies the parent of picked options (for showWhen)
}) {
  const isMulti = mode === "multi";
  const [single, setSingle] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const chosen = isMulti ? multi : single ? [single] : [];

  function toggleMulti(o: string) {
    setCustom(false);
    const next = multi.includes(o) ? multi.filter((x) => x !== o) : [...multi, o];
    setMulti(next);
    onChange?.(next);
  }
  function pickSingle(o: string, close = false) {
    setCustom(false);
    const next = single === o ? "" : o;
    setSingle(next);
    onChange?.(next ? [next] : []);
    if (close) setSheetOpen(false);
  }
  function startOther() {
    setSingle("");
    setMulti([]);
    setCustom(true);
    setSheetOpen(false);
    onChange?.([]);
  }

  const triggerLabel = custom
    ? customVal || `Other ${noun}`
    : chosen.length
      ? chosen.join(" · ")
      : `Select ${noun}`;
  const sheetTitle = noun.charAt(0).toUpperCase() + noun.slice(1);

  return (
    <div className="flex flex-col gap-2">
      {/* The fields that actually submit. */}
      {!custom && chosen.map((v) => <input key={v} type="hidden" name={fieldName} value={v} />)}

      {/* ── WEB: chips (hidden on phones) ────────────────────────────────── */}
      <div className="hidden flex-wrap gap-2 sm:flex">
        {options.map((o) => {
          const active = isMulti ? multi.includes(o) : !custom && single === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => (isMulti ? toggleMulti(o) : pickSingle(o))}
              className={chipClass(active)}
            >
              {o}
            </button>
          );
        })}
        {allowOther && (
          <button
            type="button"
            onClick={() => {
              const next = !custom;
              setCustom(next);
              onChange?.(next ? [] : chosen);
            }}
            className={chipClass(custom)}
          >
            Other…
          </button>
        )}
      </div>

      {/* ── PHONE: a bar that opens the sheet (hidden on web) ─────────────── */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-base text-zinc-900 focus:border-blue-400 focus:outline-none sm:hidden"
      >
        <span className={chosen.length || custom ? "" : "text-zinc-400"}>{triggerLabel}</span>
      </button>

      {/* The free-text field — shown (on both faces) once "Other" is chosen. */}
      {allowOther && custom && (
        <input
          type="text"
          name={otherFieldName}
          autoFocus
          value={customVal}
          onChange={(e) => setCustomVal(e.target.value)}
          placeholder={`Type the ${noun}…`}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
        />
      )}

      {sheetOpen && (
        <BottomSheet title={sheetTitle} onClose={() => setSheetOpen(false)}>
          {options.map((o) => {
            const active = isMulti && multi.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => (isMulti ? toggleMulti(o) : pickSingle(o, true))}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-center text-base font-medium transition-colors active:border-blue-400 active:bg-blue-100 ${
                  active
                    ? "border-blue-400 bg-blue-100 text-blue-800"
                    : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {active && <span aria-hidden>✓</span>}
                <span>{o}</span>
              </button>
            );
          })}
          {allowOther && (
            <button
              type="button"
              onClick={startOther}
              className="mt-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-center text-base font-medium text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
            >
              Other {noun}…
            </button>
          )}
          {isMulti && (
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-1 rounded-xl bg-blue-600 px-4 py-3.5 text-center text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

// The web chip look — matches the other categories' chips exactly.
function chipClass(active: boolean): string {
  const base = "inline-block rounded-full border px-3.5 py-2 text-sm font-medium transition-colors";
  return active
    ? `${base} border-blue-400 bg-blue-100 text-blue-800`
    : `${base} border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100`;
}
