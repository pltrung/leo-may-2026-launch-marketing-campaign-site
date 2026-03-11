"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import SafeImg, { isValidImgSrc } from "./SafeImg";

const LOGO_SRC = "/logo-white.svg";

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
    if (document.documentElement.classList.contains("cloud-selection-view")) {
      e.preventDefault();
      if (onNavigateToHome) onNavigateToHome();
      else router.replace(homePath, { scroll: true });
    } else if (isOnHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const linkClass =
    "flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-storm/20 focus:ring-offset-2 rounded cursor-pointer";

  // When parent provides transition callback (e.g. cloud selector): use button so click always fires.
  if (onNavigateToHome) {
    return (
      <button
        type="button"
        onClick={onNavigateToHome}
        className={linkClass}
        aria-label="Leo Mây — go to home"
      >
      {isValidImgSrc(LOGO_SRC) ? (
        <SafeImg src={LOGO_SRC} alt="Leo Mây" className={className} />
      ) : null}
      </button>
    );
  }

  return (
    <Link
      href={homePath}
      onClick={handleClick}
      className={linkClass}
      aria-label="Leo Mây — go to home"
    >
      {isValidImgSrc(LOGO_SRC) ? (
        <SafeImg src={LOGO_SRC} alt="Leo Mây" className={className} />
      ) : null}
    </Link>
  );
}
