"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import CloudStackMobile from "./CloudStackMobile";
import Logo from "./Logo";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const locale = useLocale();
  const { whatTypeOfCloud } = getMessages(locale).cloudSelector;

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

      {/* Mobile: fixed immersive cloud stack — cards fade in sequentially from 900ms */}
      <div className="md:hidden cloud-selection-container flex-1 w-full min-h-0 flex flex-col items-center justify-center">
        <CloudStackMobile onSelect={onSelect} onDetailsOpenChange={setDetailsOpen} />
      </div>

      {/* Desktop: grid — cards stagger in 900–1800ms */}
      <div className="hidden md:block w-full mt-8">
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
      </div>
    </section>
  );
}
