"use client";

import { useEffect } from "react";

/** Toggles .visible for spatial continuity: add on enter, remove on exit so reverse transition plays. */
export default function HeroScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -20% 0px" }
    );
    document.querySelectorAll(".hero-section-scroll").forEach((section) => {
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
