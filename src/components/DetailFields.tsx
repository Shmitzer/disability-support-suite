// DetailFields.tsx — the structured "detail" inputs for a category (option groups,
// optional amount, free-text fields). Shared by the capture form (ShiftTracker) and
// the timeline's inline edit ("Change" the type). The parent holds the group values
// so `showWhen` (and note-required rules) can react.

"use client";

import { AmountPicker } from "@/components/AmountPicker";
import { OptionPicker } from "@/components/OptionPicker";
import { findCategory, type DetailGroup, type LogAmount } from "@/lib/log-categories";
import { isNeedGroupVisible, type CareProfile } from "@/lib/care-needs";

export function DetailFields({
  category,
  learnedOptions,
  values,
  onGroupChange,
  supportNeeds,
}: {
  category: string;
  learnedOptions: Record<string, string[]>;
  values: Record<string, string[]>;
  onGroupChange: (key: string, vals: string[]) => void;
  // The participant's support-need flags — filters need-gated (`needWhen`) groups.
  // Omitted/null = show all (legacy / unconfigured).
  supportNeeds?: string[] | null;
}) {
  const cat = findCategory(category);
  const profile: CareProfile = supportNeeds ? { conditions: [], supportNeeds } : null;

  // Revamped categories use option groups (single/multi pickers) + optional amount
  // + optional free-text fields. A self-learning group (`learn`) pulls its options
  // from the DB; group values are held by the parent so `showWhen` can react.
  if (cat?.groups) {
    // Drop need-gated groups the participant's profile doesn't enable.
    const groups = cat.groups.filter((g) => isNeedGroupVisible(g, profile));
    return (
      <GroupFields
        groups={groups}
        amount={cat.amount}
        textFields={cat.textFields}
        learnedOptions={learnedOptions}
        values={values}
        onChange={onGroupChange}
      />
    );
  }
  return <LegacyDetailFields cat={cat} />;
}

// Renders a category's option groups (+ optional amount + free-text fields), with
// `showWhen` support: a group only appears once its trigger group has a matching
// value (e.g. Bristol shows only after the toilet type is Bowel/Both).
function GroupFields({
  groups,
  amount,
  textFields,
  learnedOptions,
  values,
  onChange,
}: {
  groups: DetailGroup[];
  amount?: LogAmount;
  textFields?: { key: string; label: string; placeholder?: string }[];
  learnedOptions: Record<string, string[]>;
  values: Record<string, string[]>;
  onChange: (key: string, vals: string[]) => void;
}) {
  const visible = groups.filter(
    (g) => !g.showWhen || (values[g.showWhen.group] ?? []).some((v) => g.showWhen!.in.includes(v)),
  );
  // Two-up on phones only when there are two+ pickers; otherwise full width.
  const cells = visible.length + (amount ? 1 : 0);
  const gridClass =
    cells >= 2 ? "grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3" : "grid grid-cols-1 gap-3";

  return (
    <div className="flex flex-col gap-3">
      <div className={gridClass}>
        {visible.map((g) => (
          <OptionPicker
            key={g.key}
            options={g.learn ? (learnedOptions[g.key] ?? g.options) : g.options}
            noun={g.label}
            mode={g.mode}
            fieldName={g.key}
            allowOther={g.allowOther}
            otherFieldName={`${g.key}__other`}
            onChange={(vals) => onChange(g.key, vals)}
          />
        ))}
        {amount && <AmountPicker amount={amount} />}
      </div>

      {textFields?.map((tf) => (
        <label key={tf.key} className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          {tf.label}
          <input
            type="text"
            name={tf.key}
            placeholder={tf.placeholder}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none"
          />
        </label>
      ))}
    </div>
  );
}

// Categories not yet revamped: inline multi-select chips (+ amount if any).
function LegacyDetailFields({ cat }: { cat: ReturnType<typeof findCategory> }) {
  if (!cat?.details && !cat?.amount) return null;

  return (
    <div className="flex flex-col gap-3">
      {cat.details && (
        <div className="flex flex-wrap gap-2">
          {cat.details.map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="details" value={d} className="peer sr-only" />
              <span className="inline-block rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 peer-checked:border-blue-400 peer-checked:bg-blue-100 peer-checked:text-blue-800">
                {d}
              </span>
            </label>
          ))}
        </div>
      )}

      {cat.amount && <AmountPicker amount={cat.amount} />}
    </div>
  );
}
