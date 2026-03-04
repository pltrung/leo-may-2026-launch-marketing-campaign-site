"use client";

import React, { useState, useEffect } from "react";
import GymHeader from "@/components/gym/GymHeader";
import GymScrollScene from "@/components/gym/GymScrollScene";
import GymFooter from "@/components/gym/GymFooter";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import { preloadGymIslandGLB } from "@/components/gym/three/IslandScene";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";

export default function GymWorld() {
  const [theme, setTheme] = useState<SkyTheme>(() =>
    getSkyTheme(typeof window !== "undefined" ? getLocalTimeHours() : 12)
  );

  useEffect(() => {
    preloadGymIslandGLB();
  }, []);

  useEffect(() => {
    const update = () => setTheme(getSkyTheme(getLocalTimeHours()));
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <GymHeader />
      <main>
        <GymScrollScene theme={theme} />
        <GymFooter />
      </main>
    </div>
  );
}
