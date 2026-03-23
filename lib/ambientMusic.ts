/**
 * Shared ambient background music (prelaunch, countdown, gym).
 * Mute preference persists in localStorage.
 */

export const AMBIENT_MUSIC_SRC = "/audio/beta-drift-demo-v1.mp3";

/**
 * Previous default track — still in `public/` as `As We Are.mp3` for future use; not loaded by the app.
 */
export const LEGACY_AMBIENT_MUSIC_SRC = "/As%20We%20Are.mp3";

const STORAGE_KEY = "leo_may_ambient_music_muted";

const listeners = new Set<() => void>();
/** All currently playing ambient <audio> elements (so mute applies everywhere). */
const registered = new Set<HTMLAudioElement>();

let mutedCache: boolean | null = null;

function readStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStorage(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Client-only: whether ambient music is muted (output silenced; playback may continue). */
export function getAmbientMuted(): boolean {
  if (typeof window === "undefined") return false;
  if (mutedCache === null) mutedCache = readStorage();
  return mutedCache;
}

export function setAmbientMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  mutedCache = muted;
  writeStorage(muted);
  for (const el of registered) {
    el.muted = muted;
  }
  listeners.forEach((l) => l());
}

export function subscribeAmbientMuted(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function registerAmbientAudioElement(el: HTMLAudioElement): void {
  el.muted = getAmbientMuted();
  registered.add(el);
}

export function unregisterAmbientAudioElement(el: HTMLAudioElement): void {
  registered.delete(el);
}
