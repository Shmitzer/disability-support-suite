"use client";

import { useEffect, useState } from "react";
import { useRive, useStateMachineInput, EventType } from "@rive-app/react-canvas";
import CairaStatic from "./CairaStatic";
import { CAIRA_ASPECT, STATE_NUM, type CairaState } from "./states";

const RIV_SRC = "/caira/caira.riv";
const STATE_MACHINE = "Caira";

/**
 * CairaRive — drives the Rive rig two-way:
 *   push  → sets the "state" (number) and "quiet" (boolean) inputs from props
 *   pull  → forwards Rive events to onEvent (e.g. "greetDone", "goalReached")
 * If the .riv isn't authored/available yet, it falls back to the static cutout so the
 * app looks right today and upgrades to full articulation the moment caira.riv lands.
 */
export default function CairaRive({
  state = "idle",
  size = 100,
  quiet = false,
  onEvent,
}: {
  state?: CairaState;
  size?: number;
  quiet?: boolean;
  onEvent?: (name: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const height = Math.round(size / CAIRA_ASPECT);

  const { rive, RiveComponent } = useRive({
    src: RIV_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    onLoadError: () => setFailed(true),
  });

  const stateInput = useStateMachineInput(rive, STATE_MACHINE, "state");
  const quietInput = useStateMachineInput(rive, STATE_MACHINE, "quiet");

  // Push app state → Rive inputs. Assigning `.value` is Rive's documented API for
  // driving a state-machine input, so the immutability lint is intentionally waived.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (stateInput) stateInput.value = STATE_NUM[state];
  }, [stateInput, state]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (quietInput) quietInput.value = quiet;
  }, [quietInput, quiet]);

  // Pull Rive events → app.
  useEffect(() => {
    if (!rive || !onEvent) return;
    const handler = (e: { data?: unknown }) => {
      const name = (e?.data as { name?: string } | undefined)?.name;
      if (name) onEvent(name);
    };
    rive.on(EventType.RiveEvent, handler);
    return () => rive.off(EventType.RiveEvent, handler);
  }, [rive, onEvent]);

  if (failed) return <CairaStatic state={state} size={size} quiet={quiet} />;

  return (
    <div style={{ width: size, height, filter: "drop-shadow(0 8px 18px rgba(90,65,55,0.22))" }}>
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
