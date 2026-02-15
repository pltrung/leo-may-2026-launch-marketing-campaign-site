"use client";

import { useEffect } from "react";

export default function HeroScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.45 }
    );
    document.querySelectorAll(".hero-section-scroll").forEach((section) => {
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
