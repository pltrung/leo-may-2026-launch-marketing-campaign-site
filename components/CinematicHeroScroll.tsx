"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import AscentBar from "@/components/AscentBar";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";

const SCROLL_HEADLINES_EN: string[] = [
  "CLIMB WITH INTENTION.",
  "ASCEND TOGETHER.",
  "BUILD YOUR CLOUD.",
  "SHAPE THE STANDARD.",
  "LEO MÂY — 2026.",
];

const SCROLL_HEADLINES_VI: string[] = [
  "LEO CÓ CHỦ ĐÍCH.",
  "VƯƠN CAO CÙNG NHAU.",
  "TẠO MÂY RIÊNG.",
  "ĐỊNH HÌNH CHUẨN MỰC.",
  "LEO MÂY — 2026.",
];

const ENABLE_HERO_SOUND = false;

const HERO_BG = "#0B0B0F";
const EASE_REVEAL = [0.4, 0, 0.2, 1] as const;
const EASE_AMBIENT = [0.42, 0, 0.58, 1] as const;
const EASE_SCROLL = [0.25, 0.1, 0.25, 1] as const;

const DESKTOP_INTRO_MS = 10000;
const MOBILE_INTRO_MS = 6500;
const DESKTOP_FRAME1_MS = 2000;
const DESKTOP_FRAME2_MS = 4000;
const DESKTOP_FRAME3_MS = 7000;
const MOBILE_FRAME1_MS = 1200;
const MOBILE_FRAME2_MS = 2600;
const MOBILE_FRAME3_MS = 4500;

/**
 * DESKTOP: Logo center-top, headline + mascot side-by-side, scroll crossfades 5 lines.
 * MOBILE (editorial, one focus per moment):
 *   STATE A (0% scroll): Logo top-left (sticky, never fades out). Mascot centered (hook). "CLIMB WITH INTENTION." below mascot. CTA bottom-left. Holds hidden.
 *   STATE B (1st scroll): Mascot lifts + fades out. Headline 1 fades out. Sky brightens. Holds reveal (opacity + sharpen).
 *   STATE C (2nd scroll+): Holds crisp, left text column (ASCEND TOGETHER. → crossfade 3 more lines). CTA fixed bottom-left.
 */

export interface CinematicHeroScrollProps {
  partColors: MascotPartColors | null;
  onJoin: () => void;
  locale?: Locale;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

function useIntroProgress(isMobile: boolean): number {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const duration = isMobile ? MOBILE_INTRO_MS : DESKTOP_INTRO_MS;

  useEffect(() => {
    startRef.current = null;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration]);

  return progress;
}

export default function CinematicHeroScroll({
  partColors,
  onJoin,
  locale = "en",
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const introT = useIntroProgress(isMobile);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 700);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const introDuration = isMobile ? MOBILE_INTRO_MS : DESKTOP_INTRO_MS;
  const f1 = isMobile ? MOBILE_FRAME1_MS : DESKTOP_FRAME1_MS;
  const f2 = isMobile ? MOBILE_FRAME2_MS : DESKTOP_FRAME2_MS;
  const f3 = isMobile ? MOBILE_FRAME3_MS : DESKTOP_FRAME3_MS;
  const t1 = f1 / introDuration;
  const t2 = f2 / introDuration;
  const t3 = f3 / introDuration;

  const frame1Progress = Math.min(introT / t1, 1);
  const frame2Progress = introT <= t1 ? 0 : Math.min((introT - t1) / (t2 - t1), 1);
  const frame3Progress = introT <= t2 ? 0 : Math.min((introT - t2) / (t3 - t2), 1);
  const frame4Progress = introT <= t3 ? 0 : Math.min((introT - t3) / (1 - t3), 1);

  function smoothstep(a: number, b: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  useEffect(() => {
    const viewportHeight = window.innerHeight;
    const scrollRange = Math.max(viewportHeight * 0.6, 400);
    const onScroll = () => {
      const y = window.scrollY;
      setScrollProgress(Math.min(y / scrollRange, 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleInteraction = useCallback(() => {
    setUserInteracted(true);
    if (ENABLE_HERO_SOUND && audioRef.current) {
      audioRef.current.volume = 0.15;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!ENABLE_HERO_SOUND || !userInteracted) return;
    const audio = new Audio();
    audio.volume = 0;
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [userInteracted]);

  const logoOpacity = useMemo(() => {
    if (frame1Progress < 1) return Math.min(1, frame1Progress / 0.6);
    return 1;
  }, [frame1Progress]);

  const logoScale = useMemo(
    () => 0.98 + (1 - 0.98) * Math.min(frame1Progress / 0.6, 1),
    [frame1Progress]
  );

  const taglineOpacity = useMemo(() => {
    if (frame1Progress < 0.4) return 0;
    return Math.min(0.8, (frame1Progress - 0.4) / 0.6 * 0.8);
  }, [frame1Progress]);

  const mascotOpacity = useMemo(() => {
    if (introT < t1) return 0;
    const p = frame2Progress;
    const introOpacity = Math.min(1, p * 1.2);
    if (isMobile) {
      const scrollFade = 1 - smoothstep(0.2, 0.38, scrollProgress);
      return introOpacity * scrollFade;
    }
    return introOpacity * (1 - scrollProgress);
  }, [introT, t1, frame2Progress, scrollProgress, isMobile]);

  const mascotY = useMemo(() => {
    if (introT < t1) return 10;
    const p = frame2Progress;
    return 10 * (1 - Math.min(1, p * 1.2));
  }, [introT, t1, frame2Progress]);

  const auraOpacity = useMemo(() => {
    if (introT < t2) return 0;
    const p = frame3Progress;
    const maxAura = isMobile ? 0.28 : 0.3;
    return p * maxAura;
  }, [introT, t2, frame3Progress, isMobile]);

  const wallOpacity = useMemo(() => {
    if (isMobile) return Math.min(0.65, smoothstep(0.12, 0.5, scrollProgress) * 0.5 + scrollProgress * 0.2);
    const base = introT >= t3 ? 0.2 + frame4Progress * 0.5 : 0;
    const scrollAdd = scrollProgress * 0.5;
    return Math.min(0.7, base + scrollAdd);
  }, [introT, t3, frame4Progress, scrollProgress, isMobile]);

  const holdsOpacity = useMemo(() => {
    if (isMobile) return smoothstep(0.1, 0.5, scrollProgress) * 0.85;
    if (introT < t3) return 0;
    const fadeIn = Math.min((introT - t3) / 0.25, 1);
    return 0.15 * fadeIn + (0.35 + scrollProgress * 0.2) * fadeIn;
  }, [introT, t3, scrollProgress, isMobile]);

  const holdsBlurPx = isMobile ? Math.max(0, 3 - 3 * smoothstep(0.15, 0.45, scrollProgress)) : 2;
  const holdsScaleMobile = isMobile ? 1.4 + 0.2 * smoothstep(0.2, 0.5, scrollProgress) : 1;

  const headlineOpacity = useMemo(() => {
    if (introT < t2) return 0;
    const start = t2;
    const end = t3 + 0.08;
    return Math.min(1, (introT - start) / (end - start));
  }, [introT, t2, t3]);
  const sublineOpacity = useMemo(() => (introT >= t3 ? Math.min(0.8, (frame4Progress - 0.2) * 1.5) : Math.min(0.5, headlineOpacity * 0.6)), [introT, t3, frame4Progress, headlineOpacity]);

  const particleDensity = 0.5 + scrollProgress * 0.5;

  const scrollPhase1 = Math.min(scrollProgress / 0.35, 1);
  const scrollPhase2 = scrollProgress <= 0.35 ? 0 : Math.min((scrollProgress - 0.35) / 0.35, 1);

  const SCROLL_HEADLINES: string[] = locale === "vi" ? SCROLL_HEADLINES_VI : SCROLL_HEADLINES_EN;
  const N = SCROLL_HEADLINES.length;
  const segment = 1 / (N + 0.5);

  const headlineOpacities = isMobile
    ? SCROLL_HEADLINES.map((_, i) => {
        if (i === 0) {
          const out = 1 - smoothstep(0.18, 0.38, scrollProgress);
          return out * headlineOpacity;
        }
        const inStart = 0.28 + (i - 1) * 0.2;
        const inEnd = inStart + 0.14;
        const outStart = 0.45 + (i - 1) * 0.2;
        const outEnd = outStart + 0.14;
        const inVal = smoothstep(inStart, inEnd, scrollProgress);
        const outVal = i < N - 1 ? 1 - smoothstep(outStart, outEnd, scrollProgress) : 1;
        return inVal * outVal * (scrollProgress >= 0.32 ? 1 : 0);
      })
    : SCROLL_HEADLINES.map((_, i) => {
        const inStart = Math.max(0, i * segment - 0.04);
        const inEnd = inStart + 0.12;
        const outStart = (i + 1) * segment - 0.06;
        const outEnd = outStart + 0.12;
        const inVal = smoothstep(inStart, inEnd, scrollProgress);
        const outVal = 1 - smoothstep(outStart, outEnd, scrollProgress);
        return inVal * outVal;
      });

  const headlineYs = SCROLL_HEADLINES.map((_, i) => {
    if (isMobile) {
      if (i === 0) {
        const fadeOut = 1 - smoothstep(0.18, 0.38, scrollProgress);
        return fadeOut < 1 ? -10 * (1 - fadeOut) : 0;
      }
      const inStart = 0.28 + (i - 1) * 0.2;
      const inEnd = inStart + 0.14;
      const fadeIn = smoothstep(inStart, inEnd, scrollProgress);
      const outStart = 0.45 + (i - 1) * 0.2;
      const outEnd = outStart + 0.14;
      const fadeOut = i < N - 1 ? 1 - smoothstep(outStart, outEnd, scrollProgress) : 1;
      if (fadeIn < 1) return 10 * (1 - fadeIn);
      if (fadeOut < 1) return -10 * (1 - fadeOut);
      return 0;
    }
    const inStart = Math.max(0, i * segment - 0.04);
    const inEnd = inStart + 0.12;
    const outStart = (i + 1) * segment - 0.06;
    const outEnd = outStart + 0.12;
    const fadeIn = smoothstep(inStart, inEnd, scrollProgress);
    const fadeOut = 1 - smoothstep(outStart, outEnd, scrollProgress);
    if (fadeIn < 1) return 10 * (1 - fadeIn);
    if (fadeOut < 1) return -10 * (1 - fadeOut);
    return 0;
  });

  const mascotLift1 = isMobile ? viewportHeight * 0.1 : 72;
  const mascotLift2 = isMobile ? viewportHeight * 0.05 : 36;
  const mascotTranslateY = -mascotLift1 * Math.min(1, scrollPhase1 * 1.2) - mascotLift2 * scrollPhase2;
  const mascotScaleScroll = 1 + 0.018 * scrollPhase1 + 0.012 * scrollPhase2;
  const auraOpacityScroll = scrollPhase2 * 0.15;
  const auraScaleScroll = 1 + scrollPhase2 * 0.05;
  const subcopyOneLine = scrollProgress >= 0.5;

  const breathingScale = isMobile ? 1.015 : 1.02;
  const breathDuration = 5;

  return (
    <div
      ref={containerRef}
      className="cinematic-hero relative min-h-[300vh]"
      style={{ background: HERO_BG }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onKeyDown={handleInteraction}
      role="button"
      tabIndex={0}
      aria-label="Start experience"
    >
      <AscentBar />
      <div className="sticky top-0 min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,18,24,0.6) 0%, ${HERO_BG} 70%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            boxShadow: "inset 0 0 25vh 8vh rgba(0,0,0,0.4)",
          }}
        />

        {/* Frame 3: Aura */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "min(120vmax, 1600px)",
            height: "min(120vmax, 1600px)",
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            background: "radial-gradient(circle, rgba(120,130,150,0.12) 0%, transparent 65%)",
            scale: 1 + scrollPhase2 * 0.05,
            opacity: auraOpacity * (0.6 + 0.4 * (1 - scrollProgress)) + auraOpacityScroll,
            filter: "blur(40px)",
          }}
        />

        {/* Frame 4: Wall + holds — fade in smoothly */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            opacity: wallOpacity,
            transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, rgba(30,45,70,0.4) 0%, rgba(15,20,35,0.3) 50%, transparent 100%)",
              filter: "saturate(0.7)",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: holdsOpacity,
              transition: "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/holds.svg"
              alt=""
              className="max-w-[90%] max-h-[70%] object-contain md:max-w-[90%] md:max-h-[70%]"
              style={{
                filter: isMobile ? `blur(${holdsBlurPx}px) saturate(0.88)` : "blur(2px)",
                transform: isMobile ? `scale(${holdsScaleMobile})` : undefined,
                objectPosition: "center center",
              }}
            />
          </div>
        </div>

        {/* Particles — same density feel: 12 mobile, 16 desktop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: isMobile ? 12 : 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 4,
                height: 4,
                left: `${10 + (i * 5) % 80}%`,
                top: `${20 + (i * 7) % 60}%`,
                opacity: 0,
              }}
              animate={{
                opacity: introT >= t2 ? Math.min(0.3, frame3Progress * 0.2 * particleDensity) : 0,
                y: [0, -30],
              }}
              transition={{
                opacity: { duration: 1 },
                y: { duration: 8 + (i % 4), repeat: Infinity, ease: "linear" },
              }}
            />
          ))}
        </div>

        {/* Logo: mobile = top-left sticky, never fades out; desktop = center-top */}
        <motion.div
          className={`absolute z-20 flex flex-col ${isMobile ? "top-6 left-4 md:top-8 md:left-6 items-start text-left" : "top-6 left-1/2 -translate-x-1/2 md:top-8 items-center text-center"}`}
          style={{
            opacity: isMobile ? (frame1Progress >= 1 ? 1 : logoOpacity) : logoOpacity * 0.9,
            scale: logoScale,
          }}
        >
          <Image
            src="/logo-white.svg"
            alt="Leo Mây"
            width={140}
            height={56}
            className="w-[110px] md:w-[140px] h-auto object-contain"
            priority
          />
          <motion.span
            className="mt-2 text-white/70 uppercase tracking-[0.04em] font-medium"
            style={{
              opacity: isMobile ? (frame1Progress >= 1 ? 1 : taglineOpacity) : taglineOpacity,
              fontSize: "clamp(10px, 1.2vw, 13px)",
            }}
          >
            CLIMB THE CLOUDS
          </motion.span>
        </motion.div>

        {/* Mobile: CTA fixed bottom-left (stable, premium); visible after intro */}
        {isMobile && (
          <motion.div
            className="fixed left-4 bottom-6 z-30 pointer-events-auto pb-[env(safe-area-inset-bottom)]"
            style={{ opacity: headlineOpacity }}
            initial={false}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className="px-6 py-3 rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent shadow-lg"
              style={{
                letterSpacing: "0.05em",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
              whileHover={{
                scale: 1.05,
                y: -2,
                boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
              }}
              whileTap={{ scale: 1.02 }}
            >
              JOIN THE FOUNDING ASCENT
            </motion.button>
          </motion.div>
        )}

        {/* Layout: centered block — headline + mascot side-by-side on desktop (mascot more center), stacked on mobile with mascot centered and larger */}
        <div className={`absolute inset-0 flex flex-col sm:flex-row items-center justify-center px-4 sm:px-6 md:px-8 pt-20 sm:pt-20 pb-24 z-10 pointer-events-none gap-8 sm:gap-6 md:gap-10 ${isMobile ? "items-center" : ""}`}>
          <div className={`pointer-events-auto flex flex-col justify-center w-full max-w-[min(100%,520px)] sm:max-w-[42%] ${isMobile ? "order-2 items-start text-left max-w-[85%]" : "order-1"}`}>
            {/* Headline block: max-width, generous spacing; mobile = left column, no collision with mascot */}
            <div
              className={`max-w-[min(100%,1100px)] mt-6 sm:mt-8 md:mt-12 ${isMobile ? "text-left w-full" : ""}`}
              style={{ opacity: headlineOpacity }}
            >
              <h1
                className={`relative font-bold text-white tracking-[-0.02em] leading-[1.18] sm:leading-[1.15] md:leading-[1.12] text-[clamp(28px,6.5vw,40px)] sm:text-[clamp(32px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,96px)] min-h-[1.2em] ${isMobile ? "text-left" : ""}`}
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                {SCROLL_HEADLINES.map((line, i) => (
                  <span
                    key={`${line}-${i}`}
                    className={`absolute top-0 block ${isMobile ? "left-0 right-auto" : "inset-x-0"}`}
                    style={{
                      opacity: headlineOpacities[i],
                      transform: `translateY(${headlineYs[i]}px)`,
                    }}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p
                className="mt-4 sm:mt-4 md:mt-5 text-white/80 font-normal text-[clamp(13px,1.4vw,15px)] sm:text-[clamp(13px,1.1vw,16px)] md:text-[clamp(14px,1.2vw,18px)] leading-snug"
                style={{
                  opacity: sublineOpacity,
                  fontFamily: "MiSans-Regular, sans-serif",
                }}
              >
                {subcopyOneLine ? (
                  "Premium Climbing Experience — Ho Chi Minh City — 2026"
                ) : (
                  <>
                    Premium Climbing Experience
                    <br />
                    Ho Chi Minh City — 2026
                  </>
                )}
              </p>
            </div>
            {/* CTA: desktop only (mobile uses fixed bottom-left above) */}
            {!isMobile && (
              <motion.div
                className="mt-6 sm:mt-8 md:mt-10"
                style={{ opacity: headlineOpacity }}
              >
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin();
                  }}
                  className="px-6 py-3 sm:px-7 sm:py-3 md:px-8 md:py-3.5 rounded-full border border-white/70 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent shadow-lg"
                  style={{
                    letterSpacing: "0.05em",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -2,
                    boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
                  }}
                  whileTap={{ scale: 1.02 }}
                >
                  JOIN THE FOUNDING ASCENT
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Mascot: mobile = order-1 (top), centered; desktop = order-2; fades out on scroll (STATE B) */}
          <motion.div
            className={`flex items-center justify-center flex-shrink-0 w-[70%] max-w-[300px] sm:w-[38%] sm:max-w-[280px] md:w-[40%] md:max-w-[340px] ${isMobile ? "order-1" : "order-2"}`}
            style={{
              opacity: mascotOpacity,
              transform: `translateY(${mascotY + mascotTranslateY}px) scale(${mascotScaleScroll})`,
            }}
          >
            <motion.div
              animate={
                introT >= t1
                  ? {
                      scale: [1, breathingScale, 1],
                      transition: {
                        duration: breathDuration,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
                  : undefined
              }
              className="w-full aspect-square"
            >
              {partColors ? (
                <object
                  data="/brand/ip-flying.svg"
                  type="image/svg+xml"
                  aria-hidden
                  className="w-full h-full object-contain"
                  style={{ color: "#fffef8" }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/brand/ip-flying.svg"
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Right-edge scroll particle indicator — minimal, premium, reacts to scroll */}
        <div
          className="absolute right-2 sm:right-3 top-0 bottom-0 w-px z-10 pointer-events-none overflow-hidden"
          style={{
            opacity: 0.2 + scrollProgress * 0.4,
            transition: "opacity 0.25s ease-out",
          }}
          aria-hidden
        >
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-[10%]" style={{ gap: 18 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="rounded-full bg-white flex-shrink-0"
                style={{ width: 2, height: 2, opacity: 0.5 }}
                animate={{ y: [0, -32] }}
                transition={{
                  duration: 5 + i * 0.6,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{
            opacity: introT >= t3 ? 0.6 - scrollProgress * 0.6 : 0,
            fontSize: "clamp(12px, 1vw, 14px)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span className="uppercase tracking-widest">Scroll</span>
          <span className="text-white/50">↓</span>
        </motion.div>
      </div>

      {/* Spacer for scroll */}
      <div className="h-[200vmin]" aria-hidden />
    </div>
  );
}
