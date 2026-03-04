"use client";

import React, { createContext, useContext, useCallback } from "react";
import type { GymChapter } from "@/components/gym/scroll/chapters";

type GymNavContextValue = {
  activeChapter: GymChapter;
  goToChapter: (chapter: GymChapter, opts?: { immediate?: boolean }) => Promise<void>;
  openVisitModal: () => void;
  openMembershipModal: () => void;
};

const GymNavContext = createContext<GymNavContextValue | null>(null);

export function useGymNav(): GymNavContextValue {
  const ctx = useContext(GymNavContext);
  if (!ctx) throw new Error("useGymNav must be used within GymNavProvider");
  return ctx;
}

export function GymNavProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: GymNavContextValue;
}) {
  return <GymNavContext.Provider value={value}>{children}</GymNavContext.Provider>;
}
