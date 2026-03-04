"use client";

import React from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

/**
 * Intro / About chapter. Reuses the same philosophy text from the original cinematic hero (about.paragraphs).
 */
export default function AboutChapter() {
  const locale = useLocale();
  const about = getMessages(locale as "en" | "vi").about;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto text-center">
        <h1
          className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-6"
          style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
        >
          {about.title}
        </h1>
        <div
          className="space-y-4 text-white/85 text-base md:text-lg leading-relaxed text-left"
          style={{ fontFamily: "MiSans-Regular, sans-serif" }}
        >
          {about.paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
