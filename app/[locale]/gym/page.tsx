"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "@/components/LoadingScreen";

const GymWorld = dynamic(() => import("@/components/gym/GymWorld"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function GymPage() {
  return <GymWorld />;
}
