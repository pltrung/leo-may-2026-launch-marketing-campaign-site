import Image from "next/image";

interface BrandLogoProps {
  show?: boolean;
  withGlow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandLogo({
  show = true,
  withGlow = false,
  className = "",
  style,
}: BrandLogoProps) {
  if (!show) return null;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={style}
    >
      {/* Breathing space - logo container with generous padding */}
      <div
        className={`relative transition-shadow duration-500 ${
          withGlow ? "drop-shadow-[0_0_24px_rgba(2,66,255,0.25)]" : ""
        }`}
        style={{
          padding: "clamp(2rem, 6vw, 4rem)",
          aspectRatio: "322/143",
          maxWidth: "min(280px, 80vw)",
        }}
      >
        <Image
          src="/logo.svg"
          alt="Leo Mây"
          width={322}
          height={143}
          className="h-auto w-full object-contain"
          style={{ objectFit: "contain" }}
          priority
        />
      </div>
    </div>
  );
}
