import CairaFull from "./CairaFull";

/** CairaLoading — thinking-state loading placeholder. */
export default function CairaLoading({
  size,
  label = "One moment…",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <CairaFull mood="thinking" size={size ?? 72} />
      {label && <p className="mt-2 text-xs text-caira-soft">{label}</p>}
    </div>
  );
}
