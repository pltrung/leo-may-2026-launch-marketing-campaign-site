"use client";

import Image from "next/image";

const COLORS: Record<string, string> = {
  neutral: "#94a3b8",
  blue: "#0242FF",
  yellow: "#FDFF52",
  green: "#00CB4D",
};

export default function Success({
  position,
  cloudTint,
}: {
  position: number;
  cloudTint: string;
}) {
  const accent = COLORS[cloudTint] ?? COLORS.neutral;
  const isLight = cloudTint === "yellow";

  return (
    <div className="flex flex-col items-center justify-center gap-12 px-6 text-center fade-in">
      <Image
        src="/logo.svg"
        alt="Leo Mây"
        width={200}
        height={89}
        className="w-[min(60vw,220px)] h-auto opacity-80"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      <p className="text-white/90 text-lg sm:text-xl">
        You are{" "}
        <span
          className="font-semibold px-3 py-1 rounded-lg"
          style={{
            backgroundColor: accent,
            color: isLight ? "#0f172a" : "white",
          }}
        >
          #{position}
        </span>{" "}
        on the waitlist.
      </p>
    </div>
  );
}
