"use client";

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { motion, useMotionValue, useTransform, useMotionValueEvent, animate, type MotionValue } from "framer-motion";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useCloudCardScrollMotion } from "@/lib/useCloudCardScrollMotion";

interface CloudDetailsModalProps {
  cloud: CloudPersonality;
  onClose: () => void;
  onJoinTeam: () => void;
  locale: "en" | "vi";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NEUTRAL_HEX = "#6b7280";
function mixHex(hexA: string, hexB: string, t: number): string {
  const rA = parseInt(hexA.slice(1, 3), 16);
  const gA = parseInt(hexA.slice(3, 5), 16);
  const bA = parseInt(hexA.slice(5, 7), 16);
  const rB = parseInt(hexB.slice(1, 3), 16);
  const gB = parseInt(hexB.slice(3, 5), 16);
  const bB = parseInt(hexB.slice(5, 7), 16);
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);
  return `rgb(${r},${g},${b})`;
}
function mixRgba(rgbaA: string, rgbaB: string, t: number): string {
  const matchA = rgbaA.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const matchB = rgbaB.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const aMatchA = rgbaA.match(/,\s*([\d.]+)\)/);
  const aMatchB = rgbaB.match(/,\s*([\d.]+)\)/);
  if (!matchA || !matchB || !aMatchA || !aMatchB) return rgbaB;
  const r = Math.round(Number(matchA[1]) + (Number(matchB[1]) - Number(matchA[1])) * t);
  const g = Math.round(Number(matchA[2]) + (Number(matchB[2]) - Number(matchA[2])) * t);
  const b = Math.round(Number(matchA[3]) + (Number(matchB[3]) - Number(matchA[3])) * t);
  const a = Number(aMatchA[1]) + (Number(aMatchB[1]) - Number(aMatchA[1])) * t;
  return `rgba(${r},${g},${b},${a})`;
}

function CloudDetailsModal({ cloud, onClose, onJoinTeam, locale }: CloudDetailsModalProps) {
  const accent = cloud.accentHex;
  const t = getMessages(locale).common;
  const story = locale === "vi" && cloud.storyVi ? cloud.storyVi : cloud.story;
  const shortName = locale === "vi" && cloud.shortNameVi ? cloud.shortNameVi : (cloud.shortNameEn ?? cloud.nameEn);
  const borderStyle = { borderColor: hexToRgba(accent, 0.35) };
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${cloud.name} details`}
    >
      <div
        className="cloud-details-modal cloud-details-modal-open w-full max-w-[320px] rounded-[24px] p-6 flex flex-col gap-4 cloud-card-base border backdrop-blur-xl"
        style={borderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <div style={{ color: accent }}>
            <CloudIconByType cloudId={cloud.id} className="w-14 h-14 mx-auto" />
          </div>
          <span className="font-subheadline text-lg text-center" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span className="font-body text-sm text-center opacity-80" style={{ color: accent }}>
            {shortName}
          </span>
        </div>
        <p
          className="font-body text-center text-sm leading-relaxed flex-1 text-[#1a1a1a]"
          style={{ opacity: 0.9 }}
        >
          {story}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-subheadline text-sm border border-[#ccc] text-[#555] transition-opacity hover:opacity-80"
          >
            {t.back}
          </button>
          <button
            type="button"
            onClick={onJoinTeam}
            className="cloud-join-team-btn flex-1 py-3 rounded-xl font-subheadline text-sm border-0 transition-all hover:opacity-90"
            style={{
              backgroundColor: accent,
              color: cloud.joinTextHex ?? "#ffffff",
              boxShadow: `0 0 24px ${accent}60, 0 4px 16px rgba(0,0,0,0.15)`,
            }}
          >
            {t.joinTeam} {cloud.name}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface CloudStackMobileHandle {
  spinToRandom: () => void;
}

interface CloudStackMobileProps {
  onSelect: (cloud: CloudPersonality) => void;
  onDetailsOpenChange?: (open: boolean) => void;
}

const ENTRY_FADE_MS = 800;
const ENTRY_SETTLE_MS = 200;
const INERTIA_ENABLE_DELAY_MS = ENTRY_FADE_MS + ENTRY_SETTLE_MS;
const EASE_PREMIUM = [0.22, 1, 0.36, 1] as [number, number, number, number];
const CARD_SPACING = 60;

/** Apple-style critically damped spring (no easing) */
const SPRING_STIFFNESS = 520;
const SPRING_DAMPING = 38;
const SPRING_MASS = 1;
const SPRING_SETTLE_VELOCITY = 0.02;
const SPRING_SETTLE_DISPLACEMENT = 0.01;
const RANDOMIZE_INITIAL_VELOCITY = 28;
const RANDOMIZE_CYCLES = 2;

/** Depth mult for scroll inertia per slot */
const SLOT_DEPTH_MULT: Record<number, number> = { [-1]: 0.6, 0: 1, 1: 0.6, 2: 0.3 };

/** Visual window: only centerIndex-1, centerIndex, centerIndex+1 participate. Slot 2 is always outside. */
const SLOT_OUTSIDE_WINDOW = 2;
const BLUR_PER_OFFSET = 5;

/** Rigid card transform from offset (cardIndex - stackPosition). inWindow = false => hidden (opacity 0, max blur). */
function getStyleFromOffset(offset: number, inWindow: boolean) {
  const absOffset = Math.abs(offset);
  if (!inWindow) {
    return {
      y: offset * CARD_SPACING,
      scale: 0.9,
      opacity: 0,
      filter: `blur(${BLUR_PER_OFFSET * 2}px)`,
      zIndex: 0,
      boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    };
  }
  const scale = 1 - Math.min(absOffset * 0.05, 0.1);
  const opacity = absOffset <= 0.02 ? 1 : absOffset <= 1 ? 0.6 + 0.4 * (1 - absOffset) : 0.4;
  const blurPx = Math.min(absOffset * BLUR_PER_OFFSET, 10);
  const filter = blurPx < 0.5 ? "blur(0px)" : `blur(${blurPx}px)`;
  const zIndex = absOffset <= 0.5 ? 10 : absOffset <= 1.2 ? 5 : 1;
  const boxShadow =
    absOffset <= 0.02
      ? "0 32px 64px rgba(0,0,0,0.22), 0 0 48px var(--card-glow, rgba(100,100,100,0.2))"
      : absOffset <= 1
        ? "0 14px 32px rgba(0,0,0,0.14)"
        : "0 6px 16px rgba(0,0,0,0.08)";
  return {
    y: offset * CARD_SPACING,
    scale,
    opacity,
    filter,
    zIndex,
    boxShadow,
  };
}

/** Continuous identity strength from distance to center. If distance > 1.05, force 0 (no snap). */
function useIdentityStrength(slotK: number, stackPosition: MotionValue<number>) {
  return useTransform(stackPosition, (pos: number) => {
    const frac = pos - Math.floor(pos);
    const distance = Math.abs(slotK - frac);
    if (distance > 1.05) return 0;
    return Math.max(0, 1 - distance);
  });
}

/** Rigid card transform from stackPosition: offset = slotK - frac, translateY = offset * spacing, scale/blur from offset. Visual window: slot 2 outside => hidden. */
function useSlotStyle(
  slotK: number,
  stackPosition: MotionValue<number>,
  inertiaOffset: MotionValue<number>
) {
  const inWindow = slotK !== SLOT_OUTSIDE_WINDOW;
  const full = useTransform(
    [stackPosition, inertiaOffset],
    ([pos, i]: number[]) => {
      const frac = pos - Math.floor(pos);
      const offset = slotK - frac;
      const y = offset * CARD_SPACING + i * (SLOT_DEPTH_MULT[slotK] ?? 0.3);
      return { ...getStyleFromOffset(offset, inWindow), y };
    }
  );
  const transform = useTransform(
    full,
    (s) => `translate(-50%, -50%) translateY(${s.y}px) scale(${s.scale})`
  );
  const opacity = useTransform(full, (s) => s.opacity);
  const filter = useTransform(full, (s) => s.filter);
  const zIndex = useTransform(full, (s) => s.zIndex);
  const boxShadow = useTransform(full, (s) => s.boxShadow);
  return { transform, opacity, filter, zIndex, boxShadow };
}

/** Staggered depth-based entry: back → middle → front (front settles last) */
function getEntryConfig(offset: number) {
  if (offset === 2 || offset === -1) {
    return { delay: 0, duration: 0.9, from: { opacity: 0, y: 20, scale: 0.94 }, to: { opacity: 1, y: 24, scale: 0.94 } };
  }
  if (offset === 1) {
    return { delay: 0.12, duration: 0.9, from: { opacity: 0, y: 16, scale: 0.97 }, to: { opacity: 1, y: 12, scale: 0.97 } };
  }
  return { delay: 0.24, duration: 1, from: { opacity: 0, y: 12, scale: 0.96 }, to: { opacity: 1, y: 0, scale: 1 } };
}

/** Randomize: chaos → deceleration → lock-in (all via stackPosition keyframes) */
const CHAOS_DURATION_MS = 550;
const DECEL_LOCKIN_DURATION_MS = 750;
const CHAOS_DISTANCE_MIN = 8;
const CHAOS_DISTANCE_MAX = 12;
const RANDOMIZE_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const CloudStackMobileInner = (
  { onSelect, onDetailsOpenChange }: CloudStackMobileProps,
  ref: React.Ref<CloudStackMobileHandle>
) => {
  const locale = useLocale();
  const cardStackRef = useRef<HTMLDivElement>(null);
  const [inertiaEnabled, setInertiaEnabled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInertiaEnabled(true), INERTIA_ENABLE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);
  const [detailsCloud, setDetailsCloud] = useState<CloudPersonality | null>(null);
  const [swipeGuideVisible, setSwipeGuideVisible] = useState(true);
  const touchStartY = useRef(0);
  const n = clouds.length;

  const stackPosition = useMotionValue(0);
  const inertiaOffset = useMotionValue(0);
  const targetIndexRef = useRef(0);
  const stackVelocityRef = useRef(0);
  const lastSpringTimeRef = useRef(0);
  const isRandomizingRef = useRef(false);
  const randomizeTargetPositionRef = useRef(0);
  const randomizeLandingIndexRef = useRef(0);
  const tapHandledInTouchEndRef = useRef(false);

  const [isStackAnimating, setIsStackAnimating] = useState(false);

  const onTick = useCallback(() => {
    const wrapper = cardStackRef.current?.closest(".cloud-stack-wrapper");
    if (!(wrapper instanceof HTMLElement)) return;
    const p = stackPosition.get();
    const frac = p - Math.floor(p);
    wrapper.style.setProperty("--stack-frac", String(frac));
    const fogStrength = 4 * frac * (1 - frac);
    wrapper.style.setProperty("--medium-opacity", String(fogStrength));
    const centerIdx = Math.floor(p) % n;
    const nextIdx = (centerIdx + 1) % n;
    const blendFrac = frac;
    const a = clouds[centerIdx]?.accentHex ?? "#6b7280";
    const b = clouds[nextIdx]?.accentHex ?? "#6b7280";
    wrapper.style.setProperty("--fog-blend-frac", String(blendFrac));
    wrapper.style.setProperty("--fog-accent-a", a);
    wrapper.style.setProperty("--fog-accent-b", b);
  }, [stackPosition, n]);

  useCloudCardScrollMotion(cardStackRef, inertiaEnabled, inertiaOffset, onTick);

  useMotionValueEvent(stackPosition, "change", (v) => {
    setSelectedIndex(((Math.round(v) % n) + n) % n);
  });

  useEffect(() => {
    let rafId: number;
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const pos = stackPosition.get();
      const vel = stackVelocityRef.current;
      const target = targetIndexRef.current;
      const dt = lastSpringTimeRef.current
        ? Math.min((now - lastSpringTimeRef.current) / 1000, 0.1)
        : 1 / 60;
      lastSpringTimeRef.current = now;
      const displacement = target - pos;
      const springForce = SPRING_STIFFNESS * displacement;
      const dampingForce = -SPRING_DAMPING * vel;
      const acceleration = (springForce + dampingForce) / SPRING_MASS;
      const newVel = vel + acceleration * dt;
      let newPos = pos + newVel * dt;

      if (isRandomizingRef.current) {
        if (newPos >= randomizeTargetPositionRef.current - 0.02) {
          const landing = randomizeLandingIndexRef.current;
          stackPosition.set(landing);
          stackVelocityRef.current = 0;
          targetIndexRef.current = landing;
          isRandomizingRef.current = false;
          setIsStackAnimating(false);
        } else {
          stackVelocityRef.current = newVel;
          stackPosition.set(newPos);
        }
      } else {
        newPos = Math.max(0, Math.min(n - 1, newPos));
        stackVelocityRef.current = newVel;
        stackPosition.set(newPos);
        const settled =
          Math.abs(newVel) < SPRING_SETTLE_VELOCITY &&
          Math.abs(displacement) < SPRING_SETTLE_DISPLACEMENT;
        if (settled) setIsStackAnimating(false);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stackPosition, n]);

  useEffect(() => {
    onDetailsOpenChange?.(detailsCloud !== null);
  }, [detailsCloud, onDetailsOpenChange]);

  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const syncFromPosition = () => {
      const p = stackPosition.get();
      const i = inertiaOffset.get();
      stackPosition.set(p + 0.001);
      inertiaOffset.set(i + 0.001);
      requestAnimationFrame(() => {
        stackPosition.set(p);
        inertiaOffset.set(i);
      });
    };
    const onVisibilityChange = () => {
      if (document.hidden) return;
      syncFromPosition();
      requestAnimationFrame(() => requestAnimationFrame(syncFromPosition));
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = setTimeout(syncFromPosition, 120);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    };
  }, [stackPosition, inertiaOffset]);

  const goNext = useCallback(() => {
    if (isStackAnimating) return;
    setIsStackAnimating(true);
    const next = (Math.floor(stackPosition.get()) + 1) % n;
    targetIndexRef.current = next;
  }, [isStackAnimating, stackPosition, n]);

  const goPrev = useCallback(() => {
    if (isStackAnimating) return;
    setIsStackAnimating(true);
    const prev = (Math.ceil(stackPosition.get()) - 1 + n) % n;
    targetIndexRef.current = prev;
  }, [isStackAnimating, stackPosition, n]);

  useImperativeHandle(
    ref,
    () => ({
      spinToRandom: () => {
        if (isStackAnimating) return;
        setIsStackAnimating(true);
        const finalIndex = Math.floor(Math.random() * n);
        const current = stackPosition.get();
        const currentSlot = ((Math.floor(current) % n) + n) % n;
        const stepsToFinal = (finalIndex - currentSlot + n) % n;
        const spinDistance = RANDOMIZE_CYCLES * n + stepsToFinal;
        const targetPosition = current + spinDistance;
        randomizeLandingIndexRef.current = finalIndex;
        randomizeTargetPositionRef.current = targetPosition;
        isRandomizingRef.current = true;
        targetIndexRef.current = targetPosition;
        stackVelocityRef.current = RANDOMIZE_INITIAL_VELOCITY;
      },
    }),
    [n, isStackAnimating, stackPosition]
  );

  const slotPrevStyle = useSlotStyle(-1, stackPosition, inertiaOffset);
  const slotActiveStyle = useSlotStyle(0, stackPosition, inertiaOffset);
  const slotNextStyle = useSlotStyle(1, stackPosition, inertiaOffset);
  const slotFarStyle = useSlotStyle(2, stackPosition, inertiaOffset);
  const slotStylesByOffset: Record<number, ReturnType<typeof useSlotStyle>> = {
    [-1]: slotPrevStyle,
    0: slotActiveStyle,
    1: slotNextStyle,
    2: slotFarStyle,
  };

  const identityStrengthByOffset: Record<number, MotionValue<number>> = {
    [-1]: useIdentityStrength(-1, stackPosition),
    0: useIdentityStrength(0, stackPosition),
    1: useIdentityStrength(1, stackPosition),
    2: useIdentityStrength(2, stackPosition),
  };

  const getCloudAt = useCallback(
    (offset: number) => clouds[((selectedIndex + offset) % n + n) % n],
    [selectedIndex, n]
  );

  const identityStyleByOffset: Record<number, CardIdentityStyle> = {
    [-1]: useCardIdentityStyle(getCloudAt(-1), identityStrengthByOffset[-1]),
    0: useCardIdentityStyle(getCloudAt(0), identityStrengthByOffset[0]),
    1: useCardIdentityStyle(getCloudAt(1), identityStrengthByOffset[1]),
    2: useCardIdentityStyle(getCloudAt(2), identityStrengthByOffset[2]),
  };

  const handleActiveTap = useCallback(() => {
    const cloud = getCloudAt(0);
    setDetailsCloud(cloud);
  }, [getCloudAt]);

  const handleJoinTeam = useCallback(() => {
    if (!detailsCloud) return;
    setIsBlooming(true);
    const cloud = detailsCloud;
    setDetailsCloud(null);
    setTimeout(() => onSelect(cloud), 450);
  }, [detailsCloud, onSelect]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    setSwipeGuideVisible(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -48) goNext();
    else if (dy > 48) goPrev();
    else {
      // Treat as tap: open details for current center cloud so we don't rely on
      // the delayed synthesized click (which can be suppressed or hit wrong card).
      tapHandledInTouchEndRef.current = true;
      handleActiveTap();
    }
    setIsDragging(false);
  };

  const handleTouchCancel = () => setIsDragging(false);

  const getPositionClass = (offset: number) => {
    if (offset === -1) return "prev";
    if (offset === 0) return "active";
    if (offset === 1) return "next";
    if (offset === 2) return "far";
    return "hidden";
  };

  const hideSwipeGuide = useCallback(() => setSwipeGuideVisible(false), []);

  return (
    <div
      className={`cloud-stack-wrapper relative w-full flex-1 flex flex-col min-h-0 ${detailsCloud ? "has-selection" : ""}`}
      onMouseDown={hideSwipeGuide}
    >
      {isBlooming && <div className="cloud-stack-bloom" aria-hidden />}
      <motion.div
        className={`swipe-guide md:hidden ${swipeGuideVisible ? "" : "swipe-guide-hidden"}`}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: swipeGuideVisible ? 1 : 0 }}
        transition={{
          duration: 0.5,
          delay: swipeGuideVisible ? 0.14 : 0,
          ease: EASE_PREMIUM,
        }}
      >
        <img src="/brand/cloud-mini.svg" alt="" className="swipe-cloud" />
        <div className="swipe-text">{getMessages(locale).cloudSelector.swipeUp}</div>
      </motion.div>
      {detailsCloud && (
        <CloudDetailsModal
          cloud={detailsCloud}
          locale={locale}
          onClose={() => setDetailsCloud(null)}
          onJoinTeam={handleJoinTeam}
        />
      )}

      <div className="cloud-stack-medium" aria-hidden />

      <div
        ref={cardStackRef}
        className={`card-stack flex-1 w-full min-h-0 stack-driven ${isDragging ? "dragging" : ""} ${isStackAnimating ? "stack-animating" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ touchAction: "pan-y" }}
      >
        {[-1, 0, 1, 2].map((offset) => {
          const cloud = getCloudAt(offset);
          const positionClass = getPositionClass(offset);
          if (positionClass === "hidden") return null;

          const isActive = positionClass === "active";
          const handleCardClick = isActive ? handleActiveTap : (positionClass === "next" || positionClass === "far") ? goNext : goPrev;
          const onCardClick = () => {
            if (tapHandledInTouchEndRef.current) {
              tapHandledInTouchEndRef.current = false;
              return;
            }
            handleCardClick();
          };
          const entry = getEntryConfig(offset);
          const slotStyle = slotStylesByOffset[offset];
          return (
            <motion.div
              key={`slot-${offset}`}
              className={`cloud-card ${positionClass}`}
              data-team={cloud.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: slotStyle.transform,
                opacity: slotStyle.opacity,
                filter: slotStyle.filter,
                zIndex: slotStyle.zIndex,
                boxShadow: slotStyle.boxShadow,
                ["--card-glow" as string]: identityStyleByOffset[offset].cardGlow,
              }}
              onClick={onCardClick}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                onCardClick();
              }}
              role="button"
              tabIndex={0}
              aria-label={isActive ? `Select ${cloud.name}` : (positionClass === "next" || positionClass === "far") ? "Next cloud" : "Previous cloud"}
            >
              <motion.div
                className="h-full w-full"
                initial={entry.from}
                animate={entry.to}
                transition={{
                  delay: entry.delay,
                  duration: entry.duration,
                  ease: EASE_PREMIUM,
                }}
              >
                <CloudCardInner cloud={cloud} isActive={isActive} identityStyle={identityStyleByOffset[offset]} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default forwardRef(CloudStackMobileInner);

const NEUTRAL_GLOW = "rgba(100,100,100,0.08)";

export type CardIdentityStyle = {
  identityStrengthPercent: MotionValue<string>;
  cardGlow: MotionValue<string>;
};

/** Identity: strength 0–100 for OKLCH color-mix in CSS; glow stays interpolated for box-shadow. */
function useCardIdentityStyle(cloud: CloudPersonality, identityStrength: MotionValue<number>): CardIdentityStyle {
  const accent = cloud.accentHex;
  const accentGlow = hexToRgba(accent, 0.25);
  const identityStrengthPercent = useTransform(identityStrength, (s: number) => String(s * 100));
  const cardGlow = useTransform(identityStrength, (s: number) =>
    mixRgba(NEUTRAL_GLOW, accentGlow, s)
  );
  return { identityStrengthPercent, cardGlow };
}

function CloudCardInner({
  cloud,
  isActive,
  identityStyle,
}: {
  cloud: CloudPersonality;
  isActive: boolean;
  identityStyle: CardIdentityStyle;
}) {
  return (
    <motion.div
      className={`cloud-card-inner cloud-card-base w-full h-full rounded-[24px] flex flex-col justify-center items-center p-6 overflow-hidden ${isActive ? "cloud-card-selected" : ""}`}
      style={{
        ["--card-accent" as string]: cloud.accentHex,
        ["--identity-strength" as string]: identityStyle.identityStrengthPercent,
      }}
    >
      <div className="flex flex-col items-center justify-center flex-1 min-h-0">
        <div className="mb-3 cloud-card-accent">
          <CloudIconByType cloudId={cloud.id} className="w-14 h-14" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-subheadline text-xl text-center leading-tight cloud-card-accent">
            {cloud.name}
          </span>
          <span
            className="font-body text-sm text-center tracking-[0.5px] text-[#555]"
            style={{ opacity: 0.9 }}
          >
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
