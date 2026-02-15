"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8 w-auto object-contain" }: LogoProps) {
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}`}
      className="flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-storm/20 focus:ring-offset-2 rounded"
      aria-label="Leo Mây — go to home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.svg" alt="Leo Mây" className={className} />
    </Link>
  );
}
