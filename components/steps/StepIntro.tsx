"use client";

export default function StepIntro() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]">
      {/* Layered fog gradients with parallax */}
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.7) 0%, transparent 45%),
            radial-gradient(ellipse 80% 100% at 50% 50%, rgba(248,249,251,0.8) 0%, transparent 40%)
          `,
          animation: "fogDrift 28s ease-in-out infinite",
        }}
      />
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 90% 90% at 70% 20%, rgba(255,255,255,0.6) 0%, transparent 40%),
            radial-gradient(ellipse 110% 90% at 30% 80%, rgba(235,240,250,0.5) 0%, transparent 50%)
          `,
          animation: "fogDrift 32s ease-in-out infinite reverse",
          animationDelay: "-6s",
        }}
      />
      <div
        className="fog-layer"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
          animation: "fogDrift 24s ease-in-out infinite",
          animationDelay: "-3s",
        }}
      />
      {/* Subtle grain */}
      <div className="grain-overlay" />
    </div>
  );
}
