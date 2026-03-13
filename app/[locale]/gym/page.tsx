"use client";

import dynamic from "next/dynamic";
import GymLoadingScreen from "@/components/gym/GymLoadingScreen";

const GymWorld = dynamic(() => import("@/components/gym/GymWorld"), {
  ssr: false,
  loading: () => <GymLoadingScreen />,
});

export default function GymPage() {
  return <GymWorld />;
}
