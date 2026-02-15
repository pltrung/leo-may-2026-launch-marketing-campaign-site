"use client";

export default function CloudWithEyesSection() {
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text max-w-md">
        <p className="font-medium text-white/90 text-lg sm:text-xl md:text-2xl leading-relaxed">
          Every cloud moves <span className="emphasis-blue">DIFFERENTLY</span>.
        </p>
        <p className="font-medium text-white/60 text-base sm:text-lg md:text-xl mt-2 leading-relaxed">
          So should <span className="emphasis-blue">YOU</span>.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/cloud-singing.svg"
        alt="Singing Cloud"
        className="hero-ip w-[70%] max-w-[400px] h-auto object-contain"
        loading="eager"
        fetchPriority="high"
      />
    </section>
  );
}
