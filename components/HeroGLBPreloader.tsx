"use client";

import { useEffect } from "react";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { preloadHeroClimbingHoldGLB } from "@/components/HeroClimbingHoldCanvas";

/**
 * Runs in [locale] layout so GLBs are requested as soon as the user is on any locale.
 * After a language switch the hero remounts but drei's useGLTF cache is warm, so GLBs render faster.
 */
export default function HeroGLBPreloader() {
  useEffect(() => {
    preloadHeroIslandGLB();
    preloadHeroClimbingHoldGLB();
  }, []);
  return null;
}
