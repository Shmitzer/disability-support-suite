// audio.ts — browser-only helpers for voice capture (used by ShiftTracker).
//
// Browsers record different containers/codecs (Chrome: webm/opus, Safari: mp4/aac,
// Firefox: ogg/opus), and not all are accepted by every transcription backend. So
// instead of shipping the raw recording, we DECODE it with the Web Audio API and
// re-encode to 16 kHz mono 16-bit PCM WAV — a format Gemini reliably accepts and a
// good rate for speech (small payloads). This makes transcription cross-browser.
//
// All functions here touch browser-only APIs (MediaRecorder, AudioContext,
// FileReader); import them only from client components.

// The best recording MIME type this browser supports, or "" to let MediaRecorder
// choose its default. We decode whatever it produces, so the exact choice only
// affects recording quality/availability, not the backend format.
export function pickRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const preferences = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  for (const type of preferences) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

// Can this browser record audio at all?
export function canRecordAudio(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

// --- Live transcription (Web Speech API) ------------------------------------
//
// SpeechRecognition streams interim text as the worker speaks — true live capture,
// no backend. Chrome/Edge support it (`webkitSpeechRecognition`), Safari partially;
// Firefox not at all. So it's used when present, and we fall back to the Gemini
// batch path (record → /api/transcribe) otherwise. TS has no built-in types for it,
// so we declare the minimal surface we use.
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Does this browser support live (streaming) transcription?
export function supportsLiveSpeech(): boolean {
  return getSpeechRecognition() !== null;
}

// Decode a recorded Blob and re-encode it as base64 16 kHz mono WAV.
export async function blobToWavBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const samples = downsampleToMono(decoded, 16000);
    const wav = encodeWav(samples, 16000);
    return { base64: arrayBufferToBase64(wav), mimeType: "audio/wav" };
  } finally {
    // Some browsers return a promise; ignore either way.
    void ctx.close?.();
  }
}

// Mix all channels to mono and linearly resample to `targetRate`. Returns Float32
// samples in [-1, 1].
function downsampleToMono(buffer: AudioBuffer, targetRate: number): Float32Array {
  const channels = buffer.numberOfChannels;
  const inRate = buffer.sampleRate;
  const inLength = buffer.length;

  // Average channels into one mono track.
  const mono = new Float32Array(inLength);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < inLength; i++) mono[i] += data[i] / channels;
  }
  if (targetRate >= inRate) return mono; // never upsample

  const ratio = inRate / targetRate;
  const outLength = Math.floor(inLength / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, inLength - 1);
    const frac = pos - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac; // linear interpolation
  }
  return out;
}

// Encode Float32 mono samples as a 16-bit PCM WAV file (ArrayBuffer).
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  const dataSize = samples.length * bytesPerSample;
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }
  return buffer;
}

// Base64-encode an ArrayBuffer in chunks (avoids call-stack limits on big inputs).
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
