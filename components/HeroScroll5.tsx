"use client";

/** Hero page scroll section 5: "Like clouds, no two FORMS are ever the same." */
export default function HeroScroll5() {
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text">
        <div className="hero-line-primary text-white tracking-headline">
          Like clouds, no two <span className="neon-yellow">FORMS</span> are ever the same.
        </div>
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
