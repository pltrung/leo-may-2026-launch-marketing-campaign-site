"use client";

import { useEffect, useRef } from "react";

const HERO_MUSIC_SRC = "/As%20We%20Are.mp3";

let sharedAudio: HTMLAudioElement | null = null;
let sharedStarted = false;

/**
 * Call from within a user gesture (e.g. Explore button tap). Required on mobile for audio to play.
 * Safe to call multiple times; only starts once.
 */
export function startHeroMusicFromUserGesture(): void {
  if (typeof window === "undefined" || sharedStarted) return;
  if (sharedAudio) {
    sharedAudio.play().catch(() => {});
    return;
  }
  const audio = document.createElement("audio");
  audio.src = HERO_MUSIC_SRC;
  audio.preload = "auto";
  audio.load(); // start loading immediately so play() doesn't lag (layout also preloads)
  audio.setAttribute("aria-hidden", "true");
  audio.style.position = "absolute";
  audio.style.width = "0";
  audio.style.height = "0";
  audio.style.opacity = "0";
  audio.style.pointerEvents = "none";
  document.body.appendChild(audio);
  sharedAudio = audio;
  audio.play().then(
    () => {
      sharedStarted = true;
    },
    () => {}
  );
}

export function isHeroMusicStarted(): boolean {
  return sharedStarted || (sharedAudio != null && !sharedAudio.paused);
}

/**
 * Plays hero background music when the hero entrance begins (heroReady).
 * On mobile, music is started from the Explore tap (startHeroMusicFromUserGesture); this component
 * then just skips so we don't create a second audio or remove the one that's playing.
 */
export default function HeroMusic({ heroReady }: { heroReady: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !heroReady || startedRef.current) return;
    if (isHeroMusicStarted()) return;

    const audio = document.createElement("audio");
    audio.src = HERO_MUSIC_SRC;
    audio.preload = "auto";
    audio.setAttribute("aria-hidden", "true");
    audio.style.position = "absolute";
    audio.style.width = "0";
    audio.style.height = "0";
    audio.style.opacity = "0";
    audio.style.pointerEvents = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;

    const removeListeners = () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction, { capture: true });
      document.removeEventListener("keydown", onInteraction);
    };

    const play = () => {
      if (!audioRef.current || startedRef.current) return;
      audioRef.current.play().then(
        () => {
          startedRef.current = true;
          removeListeners();
        },
        () => {}
      );
    };

    const onInteraction = () => {
      if (startedRef.current) return;
      play();
    };

    document.addEventListener("click", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true, capture: true });
    document.addEventListener("keydown", onInteraction, { once: true });
    play();

    return () => {
      removeListeners();
      if (audioRef.current && audioRef.current.parentNode) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.parentNode.removeChild(audioRef.current);
        audioRef.current = null;
      }
    };
  }, [heroReady]);

  return null;
}
