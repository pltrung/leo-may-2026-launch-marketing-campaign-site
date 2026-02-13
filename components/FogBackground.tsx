"use client";

export default function FogBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-fog opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 80%, rgba(221, 226, 230, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 80% 20%, rgba(245, 247, 250, 0.5) 0%, transparent 45%),
            radial-gradient(ellipse 80% 120% at 50% 50%, rgba(221, 226, 230, 0.3) 0%, transparent 55%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
