// ParticipantAvatar.tsx — a round participant portrait, shared across the app.
//
// For now it shows the person's initials in a soft circle, because the data
// model has no participant photos yet. When participants get profile photos
// (Phase 3), render an <img> here instead of the initials — and every place
// that uses this component updates at once. That's why it lives in one file.

// Two sizes: md for cards, sm for compact list rows.
const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
} as const;

export function ParticipantAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className={`flex ${SIZES[size]} shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700 ring-1 ring-inset ring-blue-100`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

// "Priya Sharma" -> "PS"; "Jordan" -> "J". First letters of the first two words.
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}
