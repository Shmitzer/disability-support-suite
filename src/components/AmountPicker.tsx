// AmountPicker.tsx — pick a quantity (e.g. how much a participant drank) from
// common presets, or type a custom value.
//
// Two faces, ONE value:
//   • Web  → a normal <select> dropdown (shown on wider screens).
//   • Phone → a tappable bar that opens a slide-up "bottom sheet" of big buttons.
// Which one you see is decided purely by CSS (Tailwind's `sm:` breakpoint), so
// there's no guessing the screen size in JavaScript and no hydration mismatch.
//
// Whatever the worker picks, it ends up in a single hidden <input name="amount">
// — the exact field the server already reads. So the rest of the app doesn't care
// which face was used.

"use client";

import { useState } from "react";
import type { LogAmount } from "@/lib/log-categories";
import { BottomSheet } from "@/components/BottomSheet";

export function AmountPicker({ amount }: { amount: LogAmount }) {
  const presets = amount.presets ?? [];

  // The chosen preset value as a string of mL ("" = nothing picked yet).
  const [value, setValue] = useState("");
  // Whether the worker chose "Custom" and is typing an exact number.
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  // Mobile only: is the slide-up sheet open?
  const [sheetOpen, setSheetOpen] = useState(false);

  // This is the single value the form submits.
  const submitted = custom ? customVal : value;

  // The mobile trigger bar shows the compact value (e.g. "250 mL") so it fits on
  // one line beside the drink — and matches what's saved (only the mL, not the
  // preset's name). The full "Cup / glass — 250 mL" still shows inside the sheet.
  const triggerLabel = custom
    ? customVal
      ? `${customVal} ${amount.unit}`
      : "Custom amount"
    : value
      ? `${value} ${amount.unit}`
      : `Select ${amount.label.toLowerCase()}`;

  function pickPreset(ml: number) {
    setCustom(false);
    setValue(String(ml));
    setSheetOpen(false);
  }
  function pickCustom() {
    setCustom(true);
    setValue("");
    setSheetOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* No visible label — the placeholder ("Select amount…") says what it is, and
          dropping it keeps the drink + amount bars aligned and clean. */}

      {/* The ONE field that actually submits, kept in sync with the picks above. */}
      <input type="hidden" name="amount" value={submitted} />

      {/* ── WEB: dropdown (hidden on phones) ─────────────────────────────── */}
      <select
        aria-label={amount.label}
        value={custom ? "custom" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") pickCustom();
          else {
            setCustom(false);
            setValue(v);
          }
        }}
        className="hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-blue-400 focus:outline-none sm:block"
      >
        <option value="">Select {amount.label.toLowerCase()}…</option>
        {presets.map((p) => (
          <option key={p.ml} value={p.ml}>
            {p.label} — {p.ml} {amount.unit}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>

      {/* ── PHONE: a bar that opens the bottom sheet (hidden on web) ──────── */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-base text-zinc-900 focus:border-blue-400 focus:outline-none sm:hidden"
      >
        <span className={value || custom ? "" : "text-zinc-400"}>{triggerLabel}</span>
      </button>

      {/* The custom number field — shown (on both faces) once "Custom" is chosen. */}
      {custom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            autoFocus
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            placeholder={amount.placeholder}
            className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
          />
          <span className="text-zinc-500">{amount.unit}</span>
        </div>
      )}

      {/* The slide-up sheet (mobile). Only in the DOM while open. Every button is
          type="button" so tapping one never submits the surrounding form. */}
      {sheetOpen && (
        <BottomSheet title={amount.label} onClose={() => setSheetOpen(false)}>
          {presets.map((p) => (
            <button
              key={p.ml}
              type="button"
              onClick={() => pickPreset(p.ml)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-center text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-50 active:border-blue-400 active:bg-blue-100"
            >
              {p.label} · {p.ml} {amount.unit}
            </button>
          ))}
          <button
            type="button"
            onClick={pickCustom}
            className="mt-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-center text-base font-medium text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
          >
            Custom amount…
          </button>
        </BottomSheet>
      )}
    </div>
  );
}
