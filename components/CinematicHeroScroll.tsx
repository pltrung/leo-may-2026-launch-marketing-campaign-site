"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";
import AscentBar from "@/components/AscentBar";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { getMessages } from "@/lib/messages";

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas"),
  { ssr: false }
);

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

/** Mobile: break headline into 1–2 words per row for larger, less compressed type. */
function mobileHeadlineLines(line: string): string[] {
  const words = line.trim().split(/\s+/);
  if (words.length <= 2) return [line];
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 2) {
    lines.push(words.slice(i, i + 2).join(" "));
  }
  return lines;
}

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
 * Locked cinematic hero: single 200vh timeline, sticky 100vh stage.
 * Top nav fixed; one headline stack (2 states max); final state: GLB dominant, CTA + LEO MÂY 2026.
 * Footer tagline inside stage; no blue bleed. All driven by one heroProgress (0→1 over 200vh).
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
  const scrollRafRef = useRef<number>(0);
  const scrollPendingRef = useRef<number | null>(null);

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

  // ——— Single scroll driver: 200vh total, heroProgress 0→1. All layers use this; transitions stretched across full scroll. ———
  const HERO_HEIGHT_VH = 200;
  const heroProgress = scrollProgress;
  const revealT = heroProgress;

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const scrollRange = (vh * HERO_HEIGHT_VH) / 100;
    const onScroll = () => {
      const y = window.scrollY;
      scrollPendingRef.current = Math.min(y / scrollRange, 1);
      if (scrollRafRef.current !== 0) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        const p = scrollPendingRef.current;
        if (p != null) setScrollProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [isMobile]);

  useEffect(() => {
    preloadHeroIslandGLB();
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

  // Scene 1: mascot in (intro); Scene 2: mascot up and gone (fade out 0.18→0.38)
  const mascotOpacity = useMemo(() => {
    if (introT < t1) return 0;
    const introOpacity = Math.min(1, frame2Progress * 1.2);
    const scene2Exit = 1 - smoothstep(0.18, 0.38, heroProgress);
    return introOpacity * scene2Exit;
  }, [introT, t1, frame2Progress, heroProgress]);

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

  // Scene 3: wall + holds appear (0.35→0.52); Scene 4: holds fade out (0.62→0.76)
  const wallOpacity = useMemo(() => {
    const ramp = smoothstep(0.32, 0.5, heroProgress);
    return Math.min(isMobile ? 0.65 : 0.7, ramp * (isMobile ? 0.65 : 0.7));
  }, [heroProgress, isMobile]);

  const islandFadeIn = useMemo(() => smoothstep(0.6, 0.78, heroProgress), [heroProgress]);
  const islandOpacity = islandFadeIn;

  const holdsOpacity = useMemo(() => {
    const appear = smoothstep(0.38, 0.52, heroProgress);
    const disappear = 1 - smoothstep(0.62, 0.76, heroProgress);
    return appear * disappear;
  }, [heroProgress]);

  const holdsBlurPx = isMobile ? Math.max(0, 3 - 3 * smoothstep(0.38, 0.52, heroProgress)) : 2;
  const holdsScaleMobile = isMobile ? 1.4 + 0.2 * smoothstep(0.38, 0.52, heroProgress) : 1;

  const headlineBlockOpacity = useMemo(() => {
    if (introT < t2) return 0;
    return Math.min(1, (introT - t2) / 0.2);
  }, [introT, t2]);

  // Headline per scene: segment 0→4 over heroProgress 0→1 (smooth crossfade at boundaries)
  const SCROLL_HEADLINES: string[] = locale === "vi" ? SCROLL_HEADLINES_VI : SCROLL_HEADLINES_EN;
  const N = SCROLL_HEADLINES.length;
  const headlineSegment = heroProgress * Math.max(0, N - 1);
  const headlineIndexA = Math.min(Math.floor(headlineSegment), N - 1);
  const headlineIndexB = Math.min(headlineIndexA + 1, N - 1);
  const headlineCrossfadeT = headlineIndexA === headlineIndexB ? 0 : headlineSegment - Math.floor(headlineSegment);
  const headlineOpacityA = headlineIndexA === headlineIndexB ? 1 : 1 - headlineCrossfadeT;
  const headlineOpacityB = headlineIndexA === headlineIndexB ? 0 : headlineCrossfadeT;

  // Mascot lift in scene 2 (0.2→0.4) then hold
  const scene2Lift = smoothstep(0.2, 0.4, heroProgress);
  const mascotLift1 = isMobile ? viewportHeight * 0.12 : 80;
  const mascotTranslateY = -mascotLift1 * scene2Lift;
  const mascotScaleScroll = 1 + 0.02 * scene2Lift;
  const auraOpacityScroll = smoothstep(0.5, 0.85, heroProgress) * 0.12;

  const breathingScale = isMobile ? 1.015 : 1.02;
  const breathDuration = 5;
  // Final state (0.8–1): GLB dominant; headline + meta fade out; only CTA + LEO MÂY 2026 + footer tagline
  const islandScaleBase = isMobile ? 0.85 : 1.1;
  const islandScaleFinal = isMobile ? 1.5 : 1.85;
  const islandScale = heroProgress <= 0.75
    ? islandScaleBase + (isMobile ? 0.2 : 0.25) * smoothstep(0.5, 0.75, heroProgress)
    : islandScaleBase + (islandScaleFinal - islandScaleBase) * smoothstep(0.75, 0.98, heroProgress);
  const headlineStackOpacity = 1 - smoothstep(0.78, 0.92, heroProgress);
  const metaLineOpacity = smoothstep(0.05, 0.2, heroProgress) * (1 - smoothstep(0.78, 0.9, heroProgress));
  const leoMay2026Opacity = smoothstep(0.88, 0.98, heroProgress);
  const footerTaglineOpacity = smoothstep(0.9, 1, heroProgress);
  const ctaOpacity = Math.min(1, 0.85 + 0.15 * (1 - smoothstep(0.82, 0.95, heroProgress))); // CTA visible throughout, slight emphasis at climax
  const footerEthos = getMessages(locale).footer.ethos;

  return (
    <div
      ref={containerRef}
      className="cinematic-hero relative"
      style={{ height: "200vh", background: HERO_BG }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onKeyDown={handleInteraction}
      role="button"
      tabIndex={0}
      aria-label="Start experience"
    >
      <AscentBar />
      {/* Locked stage: sticky 100vh; all hero visuals live here */}
      <div
        className="sticky top-0 h-[100vh] w-full flex flex-col items-center justify-center overflow-hidden"
        style={{ background: HERO_BG }}
      >
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
            scale: 1 + smoothstep(0.5, 0.9, heroProgress) * 0.05,
            opacity: auraOpacity * (0.6 + 0.4 * (1 - heroProgress)) + auraOpacityScroll,
            filter: "blur(40px)",
          }}
        />

        {/* Frame 4: Wall + holds — fade in smoothly */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            opacity: wallOpacity,
            transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
              filter: "saturate(0.8)",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: holdsOpacity,
              transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
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

        {/* STATE C: GLB island — fades in as holds fade out; same heroProgress driver */}
        <div className="absolute inset-0 z-[5] pointer-events-none" aria-hidden>
          <HeroIslandCanvas opacity={islandOpacity} scale={islandScale} />
        </div>

        {/* Floating particles — intensity from revealT (same curve); subtle ambient only */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: isMobile ? 12 : 16 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 4,
                height: 4,
                left: `${10 + (i * 5) % 80}%`,
                top: `${20 + (i * 7) % 60}%`,
                opacity: introT >= t2 ? Math.min(0.3, frame3Progress * 0.2 * (0.4 + revealT * 0.5)) : 0,
              }}
            />
          ))}
        </div>

        {/* Top nav: fixed, always visible during hero scroll — never fades out */}
        <div
          className={`fixed z-20 flex flex-col ${isMobile ? "top-6 left-4 md:top-8 md:left-6 items-start text-left" : "top-6 left-1/2 -translate-x-1/2 md:top-8 items-center text-center"}`}
          style={{
            opacity: isMobile ? (frame1Progress >= 1 ? 1 : logoOpacity) : logoOpacity * 0.98,
            transform: isMobile ? undefined : `translate(-50%, 0) scale(${logoScale})`,
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
          <span
            className="mt-2 text-white/70 uppercase tracking-[0.04em] font-medium"
            style={{
              opacity: isMobile ? (frame1Progress >= 1 ? 1 : taglineOpacity) : taglineOpacity,
              fontSize: "clamp(10px, 1.2vw, 13px)",
            }}
          >
            CLIMB THE CLOUDS
          </span>
        </div>

        {/* Layout: mobile = stacked (mascot top, headline below); desktop = mascot viewport-centered (absolute), headline left column */}
        <div
          className={
            isMobile
              ? "absolute inset-0 flex flex-col items-center justify-center px-4 pt-20 pb-24 z-10 pointer-events-none gap-8"
              : "absolute inset-0 flex items-center px-4 sm:px-6 md:px-8 pt-20 pb-24 z-10 pointer-events-none"
          }
        >
          <div className={`pointer-events-auto flex flex-col justify-center w-full max-w-[min(100%,520px)] ${isMobile ? "order-2 items-start text-left max-w-[85%]" : "relative z-10 max-w-[min(42%,420px)]"}`}>
            {/* Single headline stack: two states (A/B) crossfade; no ghosting; fades out in final state */}
            <div
              className={`max-w-[min(100%,1100px)] mt-6 sm:mt-8 md:mt-12 ${isMobile ? "text-left w-full" : ""}`}
              style={{ opacity: headlineBlockOpacity * headlineStackOpacity }}
            >
              <h1
                className={`relative font-bold text-white tracking-[-0.02em] ${isMobile ? "text-left text-[clamp(36px,11vw,52px)] leading-[1.2] tracking-tight min-h-[2.5em]" : "text-[clamp(28px,6.5vw,40px)] sm:text-[clamp(32px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,96px)] leading-[1.2] min-h-[2.8em] sm:min-h-[3em] md:min-h-[3.2em]"}`}
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                <span
                  key="headline-a"
                  className={`absolute top-0 block w-full ${isMobile ? "left-0 right-auto" : "left-0 right-0"}`}
                  style={{ opacity: headlineOpacityA }}
                >
                  {isMobile
                    ? mobileHeadlineLines(SCROLL_HEADLINES[headlineIndexA]).map((ln, j) => (
                        <span key={j} className="block">{ln}</span>
                      ))
                    : SCROLL_HEADLINES[headlineIndexA]}
                </span>
                <span
                  key="headline-b"
                  className={`absolute top-0 block w-full ${isMobile ? "left-0 right-auto" : "left-0 right-0"}`}
                  style={{ opacity: headlineOpacityB }}
                >
                  {isMobile
                    ? mobileHeadlineLines(SCROLL_HEADLINES[headlineIndexB]).map((ln, j) => (
                        <span key={j} className="block">{ln}</span>
                      ))
                    : SCROLL_HEADLINES[headlineIndexB]}
                </span>
              </h1>
              <p
                className={`text-white/80 font-normal leading-snug ${isMobile ? "mt-3 text-[15px] sm:text-base" : "mt-4 sm:mt-4 md:mt-5 text-[clamp(13px,1.4vw,15px)] sm:text-[clamp(13px,1.1vw,16px)] md:text-[clamp(14px,1.2vw,18px)]"}`}
                style={{
                  opacity: metaLineOpacity,
                  fontFamily: "MiSans-Regular, sans-serif",
                }}
              >
                Premium Climbing Experience — HCMC — 2026
              </p>
              {isMobile ? (
                <div className="mt-3 pointer-events-auto" style={{ opacity: ctaOpacity }}>
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
                    whileTap={{ scale: 1.02 }}
                  >
                    JOIN THE FOUNDING ASCENT
                  </motion.button>
                </div>
              ) : null}
            </div>
            {!isMobile && (
              <div className="mt-6 sm:mt-8 md:mt-10" style={{ opacity: headlineBlockOpacity * ctaOpacity }}>
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
              </div>
            )}
          </div>

          {/* Mascot: mobile = order-1, self-center; desktop = viewport-centered, shifted right to balance left-aligned text */}
          <motion.div
            className={
              isMobile
                ? "flex items-center justify-center flex-shrink-0 w-[70%] max-w-[300px] order-1 self-center"
                : "absolute flex items-center justify-center w-[38%] max-w-[320px] md:max-w-[340px] pointer-events-none"
            }
            style={{
              ...(isMobile ? {} : { left: "54%", top: "50%" }),
              opacity: mascotOpacity,
              transform: isMobile
                ? `translateY(${mascotY + mascotTranslateY}px) scale(${mascotScaleScroll})`
                : `translate(-50%, calc(-50% + ${mascotY + mascotTranslateY}px)) scale(${mascotScaleScroll})`,
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

        {/* Right-edge particle column — scroll-driven position and intensity (same heroProgress / revealT) */}
        <div
          className="absolute right-2 sm:right-3 top-0 bottom-0 w-px z-10 pointer-events-none overflow-hidden"
          style={{ opacity: 0.15 + revealT * 0.55 }}
          aria-hidden
        >
          <div
            className="absolute left-0 w-full flex flex-col items-center justify-start"
            style={{
              gap: 18,
              transform: `translateY(calc(10vh - ${heroProgress * 70}vh))`,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-full bg-white flex-shrink-0"
                style={{ width: 2, height: 2, opacity: 0.4 + revealT * 0.35 }}
              />
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{
            opacity: introT >= t3 ? 0.6 - heroProgress * 0.6 : 0,
            fontSize: "clamp(12px, 1vw, 14px)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span className="uppercase tracking-widest">Scroll</span>
          <span className="text-white/50">↓</span>
        </div>

        {/* Final state: LEO MÂY 2026 — appears cleanly at climax (no flicker) */}
        <div
          className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none"
          style={{
            opacity: leoMay2026Opacity,
            fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
            fontSize: "clamp(18px, 2.5vw, 28px)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          LEO MÂY — 2026
        </div>

        {/* Footer tagline locked inside hero stage — only visible at end of scroll */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-center max-w-[90vw] pointer-events-none"
          style={{
            opacity: footerTaglineOpacity,
            fontFamily: "MiSans-Regular, sans-serif",
            fontSize: "clamp(12px, 1.2vw, 14px)",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.03em",
          }}
        >
          {footerEthos}
        </div>
      </div>
    </div>
  );
}
