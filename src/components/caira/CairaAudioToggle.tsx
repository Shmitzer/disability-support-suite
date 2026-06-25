"use client";

import { useCaira } from "./CairaContext";

/**
 * CairaAudioToggle — mute/unmute Caira's state sounds. Always accessible so the user
 * can silence her at any time. Rendered slightly larger for participants, who may be
 * more sensitive to unexpected sound.
 */
export default function CairaAudioToggle() {
  const { muted, setMuted, persona } = useCaira();
  const size = persona === "participant" ? 34 : 28;

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Unmute Caira sounds" : "Mute Caira sounds"}
      aria-pressed={muted}
      title={muted ? "Caira sounds off" : "Caira sounds on"}
      className="flex items-center justify-center rounded-full bg-caira-teal-lt text-caira-teal-dk transition-colors hover:bg-caira-teal/20"
      style={{ width: size, height: size, fontSize: persona === "participant" ? 16 : 14 }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
