"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import CloudStackMobile, { type CloudStackMobileHandle } from "./CloudStackMobile";
import Logo from "./Logo";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { EASE_APPLE_IN_OUT } from "@/lib/enterCountdownHero";

const RANDOMIZE_BUTTON_DELAY_MS = (1240 + 250) * 2;
const RANDOMIZE_FADE_DURATION_MS = 900 * 2;
const BUTTON_EASE = [0.22, 1, 0.36, 1] as const;
/** Top-to-bottom stagger (ms), same style as countdown: [0, 220, 440, 660, 880, 1100, 1320] */
const CLOUD_STAGGER_MS = [0, 220, 440, 660, 880, 1100, 1320];
const CONTENT_DURATION = 1.1;

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
  /** When provided, Return and Logo use this (e.g. TV transition) instead of direct router.replace. */
  onReturnToHero?: () => void;
}

export default function CloudSelector({ onSelect, onReturnToHero }: CloudSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [randomizePhase, setRandomizePhase] = useState<"hidden" | "breathing">("hidden");
  const [isRandomizeTapping, setIsRandomizeTapping] = useState(false);
  const stackRef = useRef<CloudStackMobileHandle>(null);
  const router = useRouter();
  const locale = useLocale();
  const { whatTypeOfCloud, subtext, returnToHero, randomizeButton } = getMessages(locale).cloudSelector;

  const goToInitial = () => {
    if (onReturnToHero) onReturnToHero();
    else router.replace(`/${locale}`, { scroll: true });
  };

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      id="clouds"
      className={`cloud-selection-screen relative w-full h-[100dvh] md:min-h-[100dvh] md:h-auto flex flex-col items-center overflow-x-hidden overflow-y-hidden md:overflow-y-auto lg:h-screen lg:overflow-hidden px-4 pb-4 pt-[88px] md:pb-16 md:pt-24 lg:pt-20 lg:pb-8 sm:px-6 ${detailsOpen ? "card-selected" : ""}`}
    >
      {/* Logo: top-to-bottom stagger [0], same style as countdown */}
      <motion.div
        className="fixed top-0 left-0 p-4 z-30 md:pl-10 md:pt-8"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CLOUD_STAGGER_MS[0] / 1000, duration: CONTENT_DURATION, ease: EASE_APPLE_IN_OUT }}
      >
        <Logo
          className="w-[110px] md:w-[140px] max-w-[110px] md:max-w-none h-auto object-contain object-left"
          onNavigateToHome={onReturnToHero}
        />
      </motion.div>

      {/* Header: top-to-bottom stagger [1], same style as countdown */}
      <motion.div
        className="cloud-selection-header relative flex flex-col items-center w-full max-w-2xl mx-auto mt-2 md:mt-0 md:mb-8 lg:mb-2 lg:flex-shrink-0 z-10 transition-opacity duration-400"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CLOUD_STAGGER_MS[1] / 1000, duration: CONTENT_DURATION, ease: EASE_APPLE_IN_OUT }}
      >
        <h2 className="cloud-selection-title font-headline text-[22px] sm:text-[26px] md:text-[32px] leading-[1.2] md:text-5xl lg:text-4xl lg:leading-tight text-center text-white tracking-headline pl-20 pr-20 md:px-4 max-md:whitespace-nowrap">
          {whatTypeOfCloud}
        </h2>
        <p className="cloud-selection-subtext mt-2 md:mt-3 text-center text-white/80 text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2 font-normal tracking-normal">
          {subtext}
        </p>
      </motion.div>

      {/* Mobile/tablet: cloud stack + Randomize (stack shows until lg; desktop grid only at 1024px+) */}
      <div className="lg:hidden cloud-selection-container cloud-selector-container flex-1 w-full min-h-0 flex flex-col items-center">
        <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center">
          <CloudStackMobile ref={stackRef} onSelect={onSelect} onDetailsOpenChange={setDetailsOpen} contentStaggerBaseMs={CLOUD_STAGGER_MS[2]} />
        </div>
        <motion.div
          className="randomize-button-spacer"
          initial={{ opacity: 0, y: 6 }}
          animate={
            randomizePhase === "hidden"
              ? { opacity: 0, y: 6 }
              : { opacity: 1, y: 0 }
          }
          transition={{
            delay: randomizePhase === "hidden" ? CLOUD_STAGGER_MS[5] / 1000 : 0,
            duration: randomizePhase === "hidden" ? CONTENT_DURATION : 0.5,
            ease: EASE_APPLE_IN_OUT,
          }}
          onAnimationComplete={() => {
            if (randomizePhase === "hidden" && !isRandomizeTapping) setRandomizePhase("breathing");
          }}
        >
          <motion.button
            type="button"
            className={`randomize-btn rounded-full border px-5 py-2.5 text-sm font-medium backdrop-blur-sm select-none md:border-white/50 md:bg-white/10 md:text-white/95 max-md:border-white/80 max-md:bg-white/20 max-md:text-white max-md:shadow-[0_0_20px_rgba(255,255,255,0.25)] max-md:py-3 max-md:px-6 ${randomizePhase === "breathing" ? "randomize-btn-breathing" : ""} ${isRandomizeTapping ? "randomize-btn-tapping" : ""}`}
            onClick={() => {
              if (randomizePhase !== "breathing") setRandomizePhase("breathing");
              setIsRandomizeTapping(true);
              stackRef.current?.spinToRandom();
              if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                const randomCloud = clouds[Math.floor(Math.random() * clouds.length)];
                onSelect(randomCloud);
              }
              window.setTimeout(() => setIsRandomizeTapping(false), 200);
            }}
            initial={false}
            animate={
              randomizePhase === "breathing" && !isRandomizeTapping
                ? { y: [0, -2, 0], scale: [1, 1.01, 1] }
                : { y: 0, scale: isRandomizeTapping ? 0.97 : 1 }
            }
            transition={{
              duration: randomizePhase === "breathing" && !isRandomizeTapping ? 5 : 0.2,
              repeat: randomizePhase === "breathing" && !isRandomizeTapping ? Infinity : 0,
              ease: randomizePhase === "breathing" && !isRandomizeTapping ? "easeInOut" : BUTTON_EASE,
            }}
          >
            {randomizeButton}
          </motion.button>
        </motion.div>
        {/* Mobile: Return — top-to-bottom stagger [6] */}
        <motion.div
          className="lg:hidden flex-shrink-0 mt-4 mb-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: CLOUD_STAGGER_MS[6] / 1000, duration: CONTENT_DURATION, ease: EASE_APPLE_IN_OUT }}
        >
          <button
            type="button"
            onClick={goToInitial}
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/70 transition-colors"
            aria-label={returnToHero}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {returnToHero}
          </button>
        </motion.div>
      </div>

      {/* Desktop only (1024px+): one viewport, 6 cards in a row; fixed-height flip, no expand */}
      <div className="hidden lg:flex flex-1 w-full min-h-0 items-center justify-center cloud-selector-container">
        <div className="grid grid-cols-6 gap-6 w-[90%] max-w-[1400px] mx-auto justify-items-center items-center overflow-visible">
          {clouds.map((cloud, index) => (
            <motion.div
              key={cloud.id}
              className="flex justify-center items-center w-full max-w-[200px]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: CLOUD_STAGGER_MS[2] / 1000 + index * 0.18,
                duration: CONTENT_DURATION,
                ease: EASE_APPLE_IN_OUT,
              }}
            >
              <CloudCard cloud={cloud} onJoin={onSelect} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Return to hero: desktop only — top-to-bottom stagger [6] */}
      <motion.div
        className="hidden lg:flex flex-shrink-0 justify-center pt-4 pb-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CLOUD_STAGGER_MS[6] / 1000, duration: CONTENT_DURATION, ease: EASE_APPLE_IN_OUT }}
      >
        <button
          type="button"
          onClick={goToInitial}
          className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/70 transition-colors"
          aria-label={returnToHero}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {returnToHero}
        </button>
      </motion.div>
    </section>
  );
}
