"use client";

import { useEffect, useRef } from "react";

const HERO_MUSIC_SRC = "/As%20We%20Are.mp3";

/**
 * Plays hero background music when the hero entrance begins (heroReady).
 * Works on desktop and mobile: if autoplay is blocked (e.g. mobile), starts on first user interaction.
 */
export default function HeroMusic({ heroReady }: { heroReady: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !heroReady || startedRef.current) return;

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
        (_err: unknown) => {
          // Autoplay blocked (e.g. mobile); keep interaction listeners so first tap starts music
        }
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
