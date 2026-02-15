"use client";

export default function PhilosophySection() {
  return (
    <section className="hero-section hero-section-scroll hero-mist-section relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      <div className="hero-text philosophy-text">
        <span className="philosophy-line-1">Where the <span className="emphasis">MIST</span> holds space</span>
        <span className="philosophy-line-2">for what you <span className="emphasis">BECOME</span>.</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/ip-city.svg"
        alt="Leo Mây City in Clouds"
        className="hero-ip hero-ip-city mist-ip-city"
        loading="eager"
        fetchPriority="high"
      />
    </section>
  );
}
