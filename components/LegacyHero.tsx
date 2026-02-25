"use client";

import AscentBar from "@/components/AscentBar";
import HeroScroll1 from "@/components/HeroScroll1";
import HeroScroll2 from "@/components/HeroScroll2";
import HeroScroll3 from "@/components/HeroScroll3";
import HeroScroll4 from "@/components/HeroScroll4";
import HeroScroll5 from "@/components/HeroScroll5";
import HeroScroll6 from "@/components/HeroScroll6";
import HeroScroll7 from "@/components/HeroScroll7";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";

export interface LegacyHeroProps {
  partColors: MascotPartColors | null;
  onJoin: () => void;
}

/** Original hero: scroll sections 1–7 + ascent bar. Kept for rollback. */
export default function LegacyHero({ partColors, onJoin }: LegacyHeroProps) {
  return (
    <>
      <AscentBar />
      <HeroScroll1 />
      <HeroScroll2 />
      <HeroScroll3 pose="front" />
      <HeroScroll4 partColors={partColors} />
      <HeroScroll5 />
      <HeroScroll6 />
      <HeroScroll7 onJoin={onJoin} />
    </>
  );
}
