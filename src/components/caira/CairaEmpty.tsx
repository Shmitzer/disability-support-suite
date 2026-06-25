import CairaFull from "./CairaFull";

/** CairaEmpty — friendly empty-state placeholder. */
export default function CairaEmpty({
  message,
  submessage,
}: {
  message: string;
  submessage?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <CairaFull mood="idle" size={72} />
      <p className="text-center text-sm text-gray-500">{message}</p>
      {submessage && (
        <p className="mt-1 text-center text-xs text-gray-400">{submessage}</p>
      )}
    </div>
  );
}
