"use client";

export default function CloudWithEyesSection() {
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text max-w-2xl">
        <p className="cloud-eyes-line-1 font-headline philosophy-single-line text-white tracking-headline leading-tight">
          Where every cloud moves <span className="emphasis">DIFFERENTLY</span>.
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
