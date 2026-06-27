// hub-realtime.ts — participant-keyed Supabase Realtime for the hub (HUB_DATA_MODEL.md
// §Real-time multi-device sync). Best-effort + graceful: a failed/absent Realtime
// connection NEVER fails the write — the DB stays the single source of truth, and
// clients still reconcile on their next manual/timer pull.
//
// Two halves:
//   • publishHubPing()  — server-side, called after a hub write, broadcasts a tiny
//     "something changed" ping on the participant channel. No payload data crosses
//     (sidesteps RLS-on-Realtime cross-org): clients re-pull the grant-gated timeline.
//   • subscribeHubChannel() — client-side helper cd wires into the iPad + phone clients
//     to refresh on a ping and to publish presence ("Aria is adding a Meds entry…").

import { participantChannel, type HubBroadcastEvent } from "@/lib/hub";

export type HubPing = { event: HubBroadcastEvent; participantId: string; at: string };

// Server-side broadcast. Uses the supabase client lazily so this module stays import-
// safe in pure/unit contexts. Best-effort: any failure is swallowed (logged once).
export async function publishHubPing(
  participantId: string,
  event: HubBroadcastEvent,
): Promise<void> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const channel = supabase.channel(participantChannel(participantId), {
      config: { broadcast: { ack: false } },
    });
    await channel.send({
      type: "broadcast",
      event,
      payload: { event, participantId, at: new Date().toISOString() } satisfies HubPing,
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    // Realtime is an optimisation, not a correctness requirement — never throw.
    console.warn("publishHubPing failed (non-fatal):", err);
  }
}

// Client-side subscription. cd calls this in the hub screens. Returns an unsubscribe
// fn. `onPing` fires when any client writes; the component then re-pulls the timeline.
// SSR-safe: no-ops (returns a noop) if called without a browser.
export function subscribeHubChannel(
  participantId: string,
  onPing: (ping: HubPing) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  let cleanup = () => {};
  void (async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const channel = supabase
        .channel(participantChannel(participantId))
        .on("broadcast", { event: "*" }, ({ payload }) => onPing(payload as HubPing))
        .subscribe();
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("subscribeHubChannel failed (non-fatal):", err);
    }
  })();
  return () => cleanup();
}
