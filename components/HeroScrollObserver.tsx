"use client";

import { useEffect } from "react";

/** Toggles .visible for spatial continuity: add on enter, remove on exit so reverse transition plays. */
export default function HeroScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        try {
          entries.forEach((entry) => {
            const el = entry.target;
            if (!el?.isConnected) return;
            if (entry.isIntersecting) {
              el.classList.add("visible");
            } else {
              el.classList.remove("visible");
            }
          });
        } catch (_) {
          // avoid client exception on iOS when DOM/layout is in flux
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -20% 0px" }
    );
    const sections = document.querySelectorAll(".hero-section-scroll");
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return null;
}
