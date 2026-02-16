"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import CloudStackMobile, { type CloudStackMobileHandle } from "./CloudStackMobile";
import Logo from "./Logo";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

const RANDOMIZE_BUTTON_DELAY_MS = 1240 + 250;
const RANDOMIZE_FADE_DURATION_MS = 900;
const BUTTON_EASE = [0.22, 1, 0.36, 1] as const;

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [randomizePhase, setRandomizePhase] = useState<"hidden" | "breathing">("hidden");
  const [isRandomizeTapping, setIsRandomizeTapping] = useState(false);
  const stackRef = useRef<CloudStackMobileHandle>(null);
  const locale = useLocale();
  const { whatTypeOfCloud, randomizeButton } = getMessages(locale).cloudSelector;

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      id="clouds"
      className={`cloud-selection-screen relative w-full h-[100dvh] md:min-h-[100dvh] md:h-auto flex flex-col items-center overflow-x-hidden overflow-y-hidden md:overflow-y-auto px-4 pb-4 pt-[88px] md:pb-16 md:pt-24 sm:px-6 ${detailsOpen ? "card-selected" : ""}`}
    >
      {/* Logo: top-left — fades in 400–900ms */}
      <motion.div
        className="fixed top-0 left-0 p-4 z-30 md:pl-10 md:pt-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Logo className="w-[110px] md:w-[220px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
      </motion.div>

      {/* Header: on mobile 80ms (after cards); on desktop 700ms */}
      <motion.div
        className="cloud-selection-header relative flex flex-col items-center w-full max-w-2xl mx-auto mt-2 md:mt-0 md:mb-8 z-10 transition-opacity duration-400"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: isMobile ? 0.08 : 0.7,
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <h2 className="cloud-selection-title font-headline text-[22px] sm:text-[26px] md:text-[32px] leading-[1.2] md:text-5xl text-center text-white tracking-headline pl-20 pr-20 md:px-4">
          {whatTypeOfCloud}
        </h2>
      </motion.div>

      {/* Mobile/tablet: cloud stack + Randomize (stack shows until lg; desktop grid only at 1024px+) */}
      <div className="lg:hidden cloud-selection-container cloud-selector-container flex-1 w-full min-h-0 flex flex-col items-center">
        <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center">
          <CloudStackMobile ref={stackRef} onSelect={onSelect} onDetailsOpenChange={setDetailsOpen} />
        </div>
        <motion.div
          className="randomize-button-spacer"
          initial={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
          animate={
            randomizePhase === "hidden"
              ? { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          transition={{
            delay: randomizePhase === "hidden" ? RANDOMIZE_BUTTON_DELAY_MS / 1000 : 0,
            duration: randomizePhase === "hidden" ? RANDOMIZE_FADE_DURATION_MS / 1000 : 0.5,
            ease: BUTTON_EASE,
          }}
          onAnimationComplete={() => {
            if (randomizePhase === "hidden" && !isRandomizeTapping) setRandomizePhase("breathing");
          }}
        >
          <motion.button
            type="button"
            className={`randomize-btn rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/95 backdrop-blur-sm select-none ${randomizePhase === "breathing" ? "randomize-btn-breathing" : ""} ${isRandomizeTapping ? "randomize-btn-tapping" : ""}`}
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
      </div>

      {/* Desktop only (1024px+): grid + Randomize */}
      <div className="hidden lg:block w-full mt-8 cloud-selector-container">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-4xl w-full mx-auto justify-items-center items-stretch overflow-visible">
          {clouds.map((cloud, index) => (
            <motion.div
              key={cloud.id}
              className="flex justify-center items-stretch w-full max-w-[200px] lg:max-w-[240px]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.9 + index * 0.1,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <CloudCard cloud={cloud} onJoin={onSelect} />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="randomize-button-spacer"
          initial={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
          animate={
            randomizePhase === "hidden"
              ? { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          transition={{
            delay: randomizePhase === "hidden" ? RANDOMIZE_BUTTON_DELAY_MS / 1000 : 0,
            duration: randomizePhase === "hidden" ? RANDOMIZE_FADE_DURATION_MS / 1000 : 0.5,
            ease: BUTTON_EASE,
          }}
          onAnimationComplete={() => {
            if (randomizePhase === "hidden" && !isRandomizeTapping) setRandomizePhase("breathing");
          }}
        >
          <motion.button
            type="button"
            className={`randomize-btn rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/95 backdrop-blur-sm select-none ${randomizePhase === "breathing" ? "randomize-btn-breathing" : ""} ${isRandomizeTapping ? "randomize-btn-tapping" : ""}`}
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
      </div>
    </section>
  );
}
