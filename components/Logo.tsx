"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";

interface LogoProps {
  className?: string;
  /** When provided and on cloud selector, used instead of router (e.g. to run TV transition). */
  onNavigateToHome?: () => void;
}

export default function Logo({ className = "h-8 w-auto object-contain", onNavigateToHome }: LogoProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const homePath = `/${locale}`;
  const isOnHome = pathname === homePath || pathname === `${homePath}/`;

  const handleClick = (e: React.MouseEvent) => {
    if (document.body.classList.contains("cloud-selection-view")) {
      e.preventDefault();
      if (onNavigateToHome) onNavigateToHome();
      else router.replace(homePath, { scroll: true });
    } else if (isOnHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link
      href={homePath}
      onClick={handleClick}
      className="flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-storm/20 focus:ring-offset-2 rounded"
      aria-label="Leo Mây — go to home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.svg" alt="Leo Mây" className={className} />
    </Link>
  );
}
