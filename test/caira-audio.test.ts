// Unit tests for the Caira audio engine's mute state + SSR/headless safety
// (src/lib/caira/audioManager.ts). The Web Audio API doesn't exist in Node, so this
// also pins the contract that every sound is a silent no-op (never throws) when there
// is no AudioContext — the same path older/restricted browsers hit.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setMuted,
  isMuted,
  playWave,
  playExcited,
  playError,
  playSleep,
  playIdle,
  playRecordStart,
  playRecordStop,
  startThinking,
  stopThinking,
} from "../src/lib/caira/audioManager";

test("setMuted / isMuted round-trips", () => {
  setMuted(true);
  assert.equal(isMuted(), true);
  setMuted(false);
  assert.equal(isMuted(), false);
});

test("every sound is a silent no-op (no window/AudioContext) and never throws", () => {
  setMuted(false);
  assert.doesNotThrow(() => {
    playWave();
    playExcited();
    playError();
    playSleep();
    playIdle();
    playRecordStart();
    playRecordStop();
    startThinking();
    stopThinking();
  });
});

test("muted sounds are also safe no-ops", () => {
  setMuted(true);
  assert.doesNotThrow(() => {
    playWave();
    startThinking();
    stopThinking();
  });
  setMuted(false); // reset shared module state for other suites
});
