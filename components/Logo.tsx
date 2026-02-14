"use client";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8 w-auto object-contain" }: LogoProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-storm/20 focus:ring-offset-2 rounded"
      aria-label="Leo Mây — scroll to top"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.svg" alt="Leo Mây" className={className} />
    </button>
  );
}
