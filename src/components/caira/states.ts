// states.ts — the five canonical Caira states (per the brand README) and the
// numeric contract the Rive state machine expects on its "state" input.
// Pure module: safe to import from client or server.

export type CairaState = "greet" | "cheer" | "reassure" | "idle" | "goal";

// Must match the Rive state-machine "state" input mapping (see the Rive Rig spec).
export const STATE_NUM: Record<CairaState, number> = {
  greet: 0,
  cheer: 1,
  reassure: 2,
  idle: 3,
  goal: 4,
};

// The cutout's intrinsic aspect ratio (width / height) — used to size the static
// renderer so she never distorts. Derived from public/caira/caira-master.png.
export const CAIRA_ASPECT = 198 / 237;
