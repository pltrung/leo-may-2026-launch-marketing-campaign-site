"use client";

const TINT_COLORS: Record<string, string> = {
  neutral: "#94a3b8",
  blue: "#0242FF",
  yellow: "#FDFF52",
  green: "#00CB4D",
};

interface SuccessProps {
  position: number;
  cloudTint: string;
}

export default function Success({ position, cloudTint }: SuccessProps) {
  const accentColor = TINT_COLORS[cloudTint] ?? TINT_COLORS.neutral;

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-white text-lg" style={{ fontFamily: "var(--font-leo)" }}>
        You are{" "}
        <span
          className="font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: accentColor, color: "#0f172a" }}
        >
          #{position}
        </span>{" "}
        on the waitlist.
      </p>
    </div>
  );
}
