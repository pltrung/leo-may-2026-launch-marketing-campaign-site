"use client";

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useMotionValue, useTransform, useMotionValueEvent, animate, type MotionValue } from "framer-motion";
import { clouds, CloudPersonality, getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

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

/** Part 4: adjacent tiles (next/prev) slightly larger scale and less blur for depth/liveliness */
const ADJACENT_SCALE = 0.94;
const ADJACENT_BLUR_PX = 4;

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
  const scale = absOffset <= 0.02 ? 1 : absOffset <= 1 ? ADJACENT_SCALE : 1 - Math.min(absOffset * 0.05, 0.1);
  const opacity = absOffset <= 0.02 ? 1 : absOffset <= 1 ? 0.6 + 0.4 * (1 - absOffset) : 0.4;
  const blurPx = absOffset <= 0.02 ? 0 : absOffset <= 1 ? ADJACENT_BLUR_PX : Math.min(absOffset * BLUR_PER_OFFSET, 10);
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

/** Slot style driven by continuous position (used for randomize spin only). */
function useSlotStyleFromPosition(
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

/** Part 2: max visual overshoot in px (visual only; logical position unchanged) */
const VISUAL_OVERSHOOT_PX = 3;

/** Slot style from activeIndex + transition: state updates BEFORE animation. y = slotK * spacing + (1-t)*dir*spacing.
 * Part 1: optional activeScaleMultiplier for slot 0 (gesture scale response).
 * Part 2: tiny overshoot for slot 0 as it settles (visual only).
 */
function useSlotStyleFromTransition(
  slotK: number,
  transitionProgress: MotionValue<number>,
  transitionDirection: MotionValue<number>,
  scaleMultiplier: MotionValue<number>
) {
  const inWindow = slotK !== SLOT_OUTSIDE_WINDOW;
  const full = useTransform(
    [transitionProgress, transitionDirection],
    ([t, dir]: number[]) => {
      const baseY = slotK * CARD_SPACING + (1 - t) * dir * CARD_SPACING;
      const overshoot =
        slotK === 0 && t >= 0.75
          ? dir * VISUAL_OVERSHOOT_PX * (1 - Math.pow((t - 0.75) / 0.25, 2))
          : 0;
      const y = baseY + overshoot;
      return { ...getStyleFromOffset(slotK, inWindow), y };
    }
  );
  const transform = useTransform(
    [full, scaleMultiplier],
    ([s, mult]: [{ y: number; scale: number; opacity: number; filter: string; zIndex: number; boxShadow: string }, number]) =>
      `translate(-50%, -50%) translateY(${s.y}px) scale(${s.scale * mult})`
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

/**
 * CONTROLLED CAROUSEL — single source of truth, no scroll coupling.
 *
 * 1. Position: ONE MotionValue "position" (continuous 0..n). Only updated via animate() from user input.
 * 2. State machine: idle | animating | modalOpen. Input (swipe/click) only when idle.
 * 3. Bio: openBio(cloudId) only. Modal shows getCloudById(selectedCloudId). Never index.
 * 4. On modal close: restoreScrolling() then state = idle.
 */
function clampIndex(i: number, n: number): number {
  return ((Math.round(i) % n) + n) % n;
}

type CarouselState = "idle" | "animating" | "modalOpen";

const CARD_ANIM_DURATION_S = 0.42;
/** Part 1: active tile scale on gesture (0.97) and settle-back duration (120–180ms) */
const ACTIVE_SCALE_ON_GESTURE = 0.97;
const ACTIVE_SCALE_SETTLE_DURATION_S = 0.15;
/** Part 3: identity reaches full strength by this progress (sooner than 1) */
const IDENTITY_LOCKIN_THRESHOLD = 0.85;

const CloudStackMobileInner = (
  { onSelect, onDetailsOpenChange }: CloudStackMobileProps,
  ref: React.Ref<CloudStackMobileHandle>
) => {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";
  const cardStackRef = useRef<HTMLDivElement>(null);
  const n = clouds.length;

  const [carouselState, setCarouselState] = useState<CarouselState>("idle");
  const [selectedCloudId, setSelectedCloudId] = useState<CloudType | null>(null);
  const [, setPositionRenderTick] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);
  const [swipeGuideVisible, setSwipeGuideVisible] = useState(true);
  const touchStartY = useRef(0);
  const tapHandledInTouchEndRef = useRef(false);
  const [lastInput, setLastInput] = useState("");
  const scrollLockRef = useRef<{
    overflow: string;
    position: string;
    top: string;
    width: string;
    pointerEvents: string;
    touchAction: string;
  } | null>(null);
  const touchMoveListenerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const isRandomizingRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const transitionProgress = useMotionValue(1);
  const transitionDirection = useMotionValue(1);
  const position = useMotionValue(0);
  const inertiaOffset = useMotionValue(0);
  /** Part 1: active tile scale response — 0.97 on gesture start, 1 when settled */
  const activeScaleResponse = useMotionValue(1);
  const scaleOne = useMotionValue(1);

  const getCenterIndex = useCallback(() => {
    if (isRandomizingRef.current) return clampIndex(position.get(), n);
    return activeIndex;
  }, [activeIndex, n, position]);

  const onTick = useCallback(() => {
    const wrapper = cardStackRef.current?.closest(".cloud-stack-wrapper");
    if (!(wrapper instanceof HTMLElement)) return;
    const frac = isRandomizingRef.current
      ? position.get() - Math.floor(position.get())
      : 1 - transitionProgress.get();
    const centerIdx = getCenterIndex();
    const nextIdx = (centerIdx + 1) % n;
    wrapper.style.setProperty("--stack-frac", String(frac));
    const fogStrength = 4 * frac * (1 - frac);
    wrapper.style.setProperty("--medium-opacity", String(fogStrength));
    const a = clouds[centerIdx]?.accentHex ?? "#6b7280";
    const b = clouds[nextIdx]?.accentHex ?? "#6b7280";
    wrapper.style.setProperty("--fog-blend-frac", String(frac));
    wrapper.style.setProperty("--fog-accent-a", a);
    wrapper.style.setProperty("--fog-accent-b", b);
  }, [getCenterIndex, n, position, transitionProgress]);

  useMotionValueEvent(transitionProgress, "change", () => {
    if (!isRandomizingRef.current) {
      setPositionRenderTick((t) => t + 1);
      onTick();
    }
  });
  useMotionValueEvent(position, "change", () => {
    if (isRandomizingRef.current) {
      setPositionRenderTick((t) => t + 1);
      onTick();
    }
  });

  useEffect(() => {
    onTick();
  }, [onTick]);

  useEffect(() => {
    onDetailsOpenChange?.(selectedCloudId !== null);
  }, [selectedCloudId, onDetailsOpenChange]);

  useEffect(() => {
    if (!isRandomizingRef.current && carouselState === "idle") position.set(activeIndex);
  }, [activeIndex, carouselState, position]);

  const restoreScrolling = useCallback(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const saved = scrollLockRef.current;
    if (saved) {
      body.style.overflow = saved.overflow;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      body.style.pointerEvents = saved.pointerEvents;
      body.style.touchAction = saved.touchAction;
      scrollLockRef.current = null;
    }
    const listener = touchMoveListenerRef.current;
    if (listener) {
      document.removeEventListener("touchmove", listener, { capture: true });
      touchMoveListenerRef.current = null;
    }
    setCarouselState("idle");
  }, []);

  const openBio = useCallback((cloudId: CloudType) => {
    setSelectedCloudId(cloudId);
    setCarouselState("modalOpen");
    setLastInput("openBio");
    if (typeof document === "undefined") return;
    const body = document.body;
    scrollLockRef.current = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      pointerEvents: body.style.pointerEvents,
      touchAction: body.style.touchAction,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${typeof window !== "undefined" ? window.scrollY : 0}px`;
    body.style.width = "100%";
    body.style.pointerEvents = "auto";
    body.style.touchAction = "none";
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    touchMoveListenerRef.current = preventTouch;
    document.addEventListener("touchmove", preventTouch, { passive: false, capture: true });
  }, []);

  const closeBio = useCallback(() => {
    setSelectedCloudId(null);
    restoreScrolling();
  }, [restoreScrolling]);

  const runTransition = useCallback(
    (nextIndex: number, direction: number) => {
      activeScaleResponse.set(ACTIVE_SCALE_ON_GESTURE);
      setActiveIndex(nextIndex);
      transitionDirection.set(direction);
      transitionProgress.set(0);
      setCarouselState("animating");
      requestAnimationFrame(() => {
        animate(transitionProgress, 1, {
          duration: CARD_ANIM_DURATION_S,
          ease: EASE_PREMIUM,
          onComplete: () => {
            transitionProgress.set(1);
            position.set(nextIndex);
            setCarouselState("idle");
            animate(activeScaleResponse, 1, {
              duration: ACTIVE_SCALE_SETTLE_DURATION_S,
              ease: EASE_PREMIUM,
            });
          },
        });
      });
    },
    [activeScaleResponse, position, transitionDirection, transitionProgress]
  );

  const goNext = useCallback(() => {
    if (carouselState !== "idle" || n <= 0) return;
    setLastInput("wheel/swipe down");
    const nextIndex = (activeIndex + 1) % n;
    runTransition(nextIndex, 1);
  }, [activeIndex, carouselState, n, runTransition]);

  const goPrev = useCallback(() => {
    if (carouselState !== "idle" || n <= 0) return;
    setLastInput("wheel/swipe up");
    const nextIndex = (activeIndex - 1 + n) % n;
    runTransition(nextIndex, -1);
  }, [activeIndex, carouselState, n, runTransition]);

  useImperativeHandle(
    ref,
    () => ({
      spinToRandom: () => {
        if (n <= 0) return;
        setLastInput("randomize");
        setCarouselState("animating");
        isRandomizingRef.current = true;
        setIsRandomizing(true);
        const finalIndex = Math.floor(Math.random() * n);
        position.set(activeIndex);
        const spinDistance = RANDOMIZE_CYCLES * n + ((finalIndex - activeIndex + n) % n);
        const targetPosition = activeIndex + spinDistance;
        animate(position, targetPosition, {
          duration: (CHAOS_DURATION_MS + DECEL_LOCKIN_DURATION_MS) / 1000,
          ease: RANDOMIZE_EASE,
          onComplete: () => {
            position.set(finalIndex);
            setActiveIndex(finalIndex);
            isRandomizingRef.current = false;
            setIsRandomizing(false);
            setCarouselState("idle");
          },
        });
      },
    }),
    [n, position, activeIndex]
  );

  const slotPrevTransition = useSlotStyleFromTransition(-1, transitionProgress, transitionDirection, scaleOne);
  const slotActiveTransition = useSlotStyleFromTransition(0, transitionProgress, transitionDirection, activeScaleResponse);
  const slotNextTransition = useSlotStyleFromTransition(1, transitionProgress, transitionDirection, scaleOne);
  const slotFarTransition = useSlotStyleFromTransition(2, transitionProgress, transitionDirection, scaleOne);
  const slotPrevPosition = useSlotStyleFromPosition(-1, position, inertiaOffset);
  const slotActivePosition = useSlotStyleFromPosition(0, position, inertiaOffset);
  const slotNextPosition = useSlotStyleFromPosition(1, position, inertiaOffset);
  const slotFarPosition = useSlotStyleFromPosition(2, position, inertiaOffset);

  const slotStylesByOffset: Record<
    number,
    ReturnType<typeof useSlotStyleFromTransition>
  > = isRandomizing
    ? {
        [-1]: slotPrevPosition,
        0: slotActivePosition,
        1: slotNextPosition,
        2: slotFarPosition,
      }
    : {
        [-1]: slotPrevTransition,
        0: slotActiveTransition,
        1: slotNextTransition,
        2: slotFarTransition,
      };

  const identityConstPrev = useMotionValue(0.65);
  const identityConstActive = useMotionValue(1);
  const identityConstNext = useMotionValue(0.65);
  const identityConstFar = useMotionValue(0.35);
  /** Part 3: slot 0 identity reaches full strength sooner during transition (no lag behind position) */
  const identityTransitionActive = useTransform(transitionProgress, (t: number) =>
    Math.min(1, t / IDENTITY_LOCKIN_THRESHOLD)
  );
  const identityFromPosition = {
    [-1]: useIdentityStrength(-1, position),
    0: useIdentityStrength(0, position),
    1: useIdentityStrength(1, position),
    2: useIdentityStrength(2, position),
  };
  const identityFromConstant = {
    [-1]: identityConstPrev,
    0: identityTransitionActive,
    1: identityConstNext,
    2: identityConstFar,
  };
  const identityStrengthByOffset: Record<number, MotionValue<number>> = isRandomizing
    ? identityFromPosition
    : identityFromConstant;

  /** Cloud at slot offset from center. Center = getCenterIndex(). */
  const getCloudAt = useCallback(
    (offset: number) => clouds[((getCenterIndex() + offset) % n + n) % n],
    [getCenterIndex, n]
  );

  const identityStyleByOffset: Record<number, CardIdentityStyle> = {
    [-1]: useCardIdentityStyle(getCloudAt(-1), identityStrengthByOffset[-1]),
    0: useCardIdentityStyle(getCloudAt(0), identityStrengthByOffset[0]),
    1: useCardIdentityStyle(getCloudAt(1), identityStrengthByOffset[1]),
    2: useCardIdentityStyle(getCloudAt(2), identityStrengthByOffset[2]),
  };

  const handleJoinTeam = useCallback(() => {
    if (!selectedCloudId) return;
    const cloud = getCloudById(selectedCloudId);
    if (!cloud) return;
    setIsBlooming(true);
    setSelectedCloudId(null);
    restoreScrolling();
    setTimeout(() => onSelect(cloud), 450);
  }, [selectedCloudId, onSelect, restoreScrolling]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    activeScaleResponse.set(ACTIVE_SCALE_ON_GESTURE);
    setIsDragging(true);
    setSwipeGuideVisible(false);
  };

  const TAP_THRESHOLD_PX = 10;
  const WHEEL_THRESHOLD = 40;
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (carouselState !== "idle" || n <= 0) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      if (e.deltaY > 0) {
        setLastInput("wheel down");
        runTransition((activeIndex + 1) % n, 1);
      } else {
        setLastInput("wheel up");
        runTransition((activeIndex - 1 + n) % n, -1);
      }
    },
    [activeIndex, carouselState, n, runTransition]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      tapHandledInTouchEndRef.current = true;
      if (carouselState !== "idle") {
        setIsDragging(false);
        return;
      }
      if (dy < -TAP_THRESHOLD_PX) goNext();
      else if (dy > TAP_THRESHOLD_PX) goPrev();
      else {
        const idx = isRandomizingRef.current ? clampIndex(position.get(), n) : activeIndex;
        const cloud = clouds[idx];
        if (cloud) openBio(cloud.id);
        animate(activeScaleResponse, 1, {
          duration: ACTIVE_SCALE_SETTLE_DURATION_S,
          ease: EASE_PREMIUM,
        });
      }
      setIsDragging(false);
    },
    [activeIndex, activeScaleResponse, carouselState, goNext, goPrev, n, openBio, position]
  );

  const handleTouchCancel = () => setIsDragging(false);

  const getPositionClass = (offset: number) => {
    if (offset === -1) return "prev";
    if (offset === 0) return "active";
    if (offset === 1) return "next";
    if (offset === 2) return "far";
    return "hidden";
  };

  const hideSwipeGuide = useCallback(() => setSwipeGuideVisible(false), []);

  const selectedCloud = selectedCloudId ? getCloudById(selectedCloudId) : null;
  const isStackAnimating = carouselState === "animating";

  return (
    <div
      className={`cloud-stack-wrapper relative w-full flex-1 flex flex-col min-h-0 ${selectedCloudId ? "has-selection" : ""}`}
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
      {selectedCloud && (
        <CloudDetailsModal
          cloud={selectedCloud}
          locale={locale}
          onClose={closeBio}
          onJoinTeam={handleJoinTeam}
        />
      )}

      <div className="cloud-stack-medium" aria-hidden />

      {debug && (
        <div
          className="fixed bottom-20 left-2 z-50 rounded-lg bg-black/80 px-2 py-1.5 font-mono text-[10px] text-white shadow"
          aria-hidden
        >
          <div>activeIndex: {getCenterIndex()}</div>
          <div>activeCloudId: {clouds[getCenterIndex()]?.id ?? "-"}</div>
          <div>state: {carouselState}</div>
          <div>lastInput: {lastInput || "-"}</div>
        </div>
      )}

      {/* touchAction: none so the browser doesn't use vertical swipe for page scroll. */}
      <div
        ref={cardStackRef}
        className={`card-stack flex-1 w-full min-h-0 stack-driven ${isDragging ? "dragging" : ""} ${isStackAnimating ? "stack-animating" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
      >
        {[-1, 0, 1, 2].map((offset) => {
          const cloud = getCloudAt(offset);
          const positionClass = getPositionClass(offset);
          if (positionClass === "hidden") return null;

          const isActive = positionClass === "active";
          const onCardClick = () => {
            if (tapHandledInTouchEndRef.current) {
              tapHandledInTouchEndRef.current = false;
              return;
            }
            if (carouselState !== "idle") return;
            if (isActive) openBio(cloud.id);
            else if (positionClass === "next" || positionClass === "far") goNext();
            else goPrev();
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
